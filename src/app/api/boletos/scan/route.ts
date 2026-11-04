import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { verifySameOrigin } from '@/lib/security/csrf';
import { logAudit } from '@/lib/security/audit';
import { todayISODate } from '@/lib/date';
import { applyUserRules } from '@/lib/supabase/queries/rules';
import { findBillByBarcode } from '@/lib/supabase/queries/bills';
import { AiNotConfiguredError, AiRequestError, extractBoletoFromImage } from '@/lib/boleto/extract';
import { reconcileBoleto } from '@/lib/boleto/reconcile';
import { onlyDigits, parseBoletoCode } from '@/lib/boleto/parser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** O tipo vem dos bytes do arquivo, não do que o cliente declarou. */
function sniffImage(buf: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.length > 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

function fail(error: string, status: number, code?: string) {
  return NextResponse.json({ error, code }, { status });
}

/**
 * POST /api/boletos/scan
 *  - multipart/form-data com campo "image": lê a foto (IA + código de barras)
 *  - application/json { code }: lê só o código digitado/colado (sem IA)
 * Não grava nada: devolve a proposta para o usuário conferir e salvar.
 */
export async function POST(request: Request) {
  if (!verifySameOrigin(request)) return fail('Origem da requisição inválida', 403);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail('Não autenticado', 401);

  const rate = await checkRateLimit('boleto.scan', 30, 60);
  if (!rate.allowed) return fail('Muitas leituras recentes. Tente novamente mais tarde.', 429);

  const { data: cats, error: catError } = await supabase
    .from('transaction_categories').select('id, name').eq('kind', 'expense');
  if (catError) return fail('Falha ao carregar categorias', 500);
  const categories = (cats ?? []) as { id: string; name: string }[];

  const contentType = request.headers.get('content-type') ?? '';
  let origin: 'image' | 'code';
  let vision = null as Awaited<ReturnType<typeof extractBoletoFromImage>> | null;
  let typedCode: string | null = null;

  if (contentType.includes('application/json')) {
    origin = 'code';
    const body = await request.json().catch(() => null) as { code?: unknown } | null;
    typedCode = typeof body?.code === 'string' ? body.code.slice(0, 200) : null;
    const digits = typedCode ? onlyDigits(typedCode) : '';
    if (!parseBoletoCode(digits)) {
      return fail('Código inválido. A linha digitável tem 47 ou 48 dígitos (ou 44, se for o código de barras).', 422);
    }
  } else if (contentType.includes('multipart/form-data')) {
    origin = 'image';
    const form = await request.formData().catch(() => null);
    const file = form?.get('image');
    if (!(file instanceof File)) return fail('Envie uma imagem do boleto.', 400);
    if (file.size === 0 || file.size > MAX_IMAGE_BYTES) return fail('A imagem deve ter no máximo 5 MB.', 413);

    const buf = Buffer.from(await file.arrayBuffer());
    const mediaType = sniffImage(buf);
    if (!mediaType) return fail('Formato não suportado. Use JPG, PNG ou WebP.', 415);

    try {
      vision = await extractBoletoFromImage({
        base64: buf.toString('base64'), mediaType, categoryNames: categories.map((c) => c.name),
      });
    } catch (err) {
      if (err instanceof AiNotConfiguredError) {
        return fail('A leitura por foto não está configurada neste servidor (ANTHROPIC_API_KEY). Cole a linha digitável para continuar.', 503, 'AI_NOT_CONFIGURED');
      }
      if (err instanceof AiRequestError) return fail(err.message, 502);
      return fail('Falha ao ler a imagem', 500);
    }
    if (!vision.isBoleto) return fail('Não parece um boleto ou conta a pagar. Tire outra foto, enquadrando o documento inteiro.', 422);
  } else {
    return fail('Tipo de requisição não suportado', 415);
  }

  const textForRules = [vision?.beneficiary, vision?.description].filter(Boolean).join(' ');
  const userRuleCategoryId = textForRules ? await applyUserRules(textForRules) : null;

  const result = reconcileBoleto({
    origin, vision, typedCode, categories, userRuleCategoryId, today: todayISODate(),
  });

  if (result.barcode) {
    const existing = await findBillByBarcode(result.barcode);
    if (existing) {
      result.duplicateBillId = existing.id;
      result.warnings.unshift('Este boleto já está cadastrado no sistema.');
    }
  }

  await logAudit('boleto.scan', 'payable_bills', undefined, { origin, codeValid: result.codeValid, confidence: result.confidence });
  return NextResponse.json({ result });
}
