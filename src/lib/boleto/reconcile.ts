import { isValidDateOnly, daysBetween } from '@/lib/date';
import { findBoletoCodes, parseBoletoCode, type ParsedBoleto } from './parser';
import { FALLBACK_CATEGORY, suggestBillCategory, type CategorySource } from './categorize';
import type { BoletoScanResult, ScanCategory, VisionBoletoResult } from './types';

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Junta o que a IA leu da foto com o que o código de barras diz.
 *
 * Regra de ouro: o CÓDIGO DE BARRAS com dígitos verificadores válidos é a fonte
 * da verdade para valor e vencimento (a IA pode errar um dígito ao ler a foto;
 * o dígito verificador denuncia isso). Quando os dois divergem, usamos o código
 * e avisamos. Sem código válido, usamos a leitura da imagem e deixamos claro que
 * é preciso conferir. Nada é gravado aqui: o usuário confirma na tela.
 */
export function reconcileBoleto(input: {
  origin: 'image' | 'code';
  vision: VisionBoletoResult | null;
  typedCode?: string | null;
  categories: ScanCategory[];
  /** category_id vindo das regras do usuário (financial_rules), se alguma bateu. */
  userRuleCategoryId?: string | null;
  now?: Date;
  /** 'YYYY-MM-DD' de hoje no fuso do Brasil. */
  today: string;
}): BoletoScanResult {
  const { vision, categories, today } = input;
  const now = input.now ?? new Date();
  const warnings: string[] = [];

  // ---- 1. código de barras: digitado > lido pela IA ----
  const codeTexts = [input.typedCode, vision?.digitableLine].filter((c): c is string => !!c);
  let parsed: ParsedBoleto | null = null;
  for (const text of codeTexts) {
    const valid = parseBoletoCode(text, now) ?? findBoletoCodes(text, now)[0] ?? null;
    if (valid?.checksOk) { parsed = valid; break; }
    if (valid && !parsed) parsed = valid; // guarda a inválida só para avisar
  }
  const codeValid = parsed ? parsed.checksOk : null;
  const trusted = parsed && parsed.checksOk ? parsed : null;

  if (parsed && !parsed.checksOk) {
    warnings.push('Os dígitos do código de barras não conferem — a leitura da foto pode ter errado algum número. Confira o código ou tire outra foto, mais perto e sem reflexo.');
  }
  if (!parsed && input.origin === 'image') {
    warnings.push('Não consegui ler o código de barras. Valor e vencimento vieram só do texto da imagem — confira antes de salvar.');
  }

  // ---- 2. valor ----
  let amount: number | null = null;
  let amountSource: 'code' | 'image' | null = null;
  const visionAmount = vision?.amount != null && vision.amount > 0 ? vision.amount : null;
  if (trusted?.amountCents != null) {
    amount = trusted.amountCents / 100;
    amountSource = 'code';
    if (visionAmount != null && Math.abs(visionAmount - amount) > 0.005) {
      warnings.push(`O valor lido na imagem (${BRL(visionAmount)}) é diferente do valor do código de barras (${BRL(amount)}). Usei o do código.`);
    }
  } else if (visionAmount != null) {
    amount = visionAmount;
    amountSource = 'image';
    if (trusted) warnings.push('Boleto sem valor fixo no código (valor livre/referência): confirme o valor a pagar.');
  }
  if (amount == null) warnings.push('Não identifiquei o valor. Informe manualmente.');

  // ---- 3. vencimento ----
  let dueDate: string | null = null;
  let dueDateSource: 'code' | 'image' | null = null;
  const visionDue = vision?.dueDate && isValidDateOnly(vision.dueDate) ? vision.dueDate : null;
  if (trusted?.dueDate) {
    dueDate = trusted.dueDate;
    dueDateSource = 'code';
    if (visionDue && visionDue !== dueDate) {
      warnings.push(`O vencimento lido na imagem (${fmtDate(visionDue)}) é diferente do vencimento do código de barras (${fmtDate(dueDate)}). Usei o do código.`);
    }
  } else if (visionDue) {
    dueDate = visionDue;
    dueDateSource = 'image';
  }
  if (!dueDate) {
    warnings.push(trusted?.kind === 'utility'
      ? 'Contas de consumo/tributos não trazem o vencimento no código de barras e não consegui ler na imagem. Informe a data.'
      : 'Não identifiquei o vencimento. Informe a data.');
  } else {
    const diff = daysBetween(today, dueDate);
    if (diff < 0) warnings.push(`Este boleto venceu há ${-diff} dia${diff === -1 ? '' : 's'}. Pode haver multa e juros — confira o valor atualizado com o beneficiário.`);
    else if (diff > 365 * 2) warnings.push('Vencimento a mais de 2 anos — confira a data.');
  }

  // ---- 4. categoria ----
  const available = new Set(categories.map((c) => c.name));
  const byName = new Map(categories.map((c) => [c.name, c.id]));
  const byId = new Map(categories.map((c) => [c.id, c.name]));

  let categoryName: string;
  let categorySource: CategorySource;
  let categoryId: string | null;
  if (input.userRuleCategoryId && byId.has(input.userRuleCategoryId)) {
    categoryId = input.userRuleCategoryId;
    categoryName = byId.get(categoryId)!;
    categorySource = 'rule';
  } else {
    const s = suggestBillCategory({
      beneficiary: vision?.beneficiary, description: vision?.description,
      segmentCode: trusted?.kind === 'utility' ? trusted.segmentCode : null,
      aiCategory: vision?.category, availableNames: available,
    });
    categoryName = s.categoryName;
    categorySource = s.source;
    categoryId = byName.get(categoryName) ?? null;
  }

  // ---- 5. descrição / confiança ----
  const beneficiary = clean(vision?.beneficiary);
  const description = clean(vision?.description) ?? beneficiary
    ?? (trusted?.kind === 'utility' && trusted.segmentLabel ? `Conta de ${trusted.segmentLabel.toLowerCase()}` : null)
    ?? 'Boleto';

  const mismatch = warnings.some((w) => w.includes('é diferente'));
  let confidence: number;
  if (trusted) confidence = amount != null && dueDate ? 0.97 : 0.85;
  else if (vision) confidence = Math.min(clamp01(vision.confidence), 0.7);
  else confidence = 0.3;
  if (mismatch) confidence = Math.min(confidence, 0.75);

  return {
    origin: input.origin,
    description: description.slice(0, 200),
    beneficiary: beneficiary?.slice(0, 200) ?? null,
    amount, dueDate, categoryId,
    categoryName: categoryId ? categoryName : FALLBACK_CATEGORY,
    categorySource,
    digitableLine: parsed?.digitableLine ?? null,
    barcode: parsed?.barcode ?? null,
    codeValid, amountSource, dueDateSource, confidence, warnings,
    duplicateBillId: null,
  };
}

function clean(value: string | null | undefined): string | null {
  const v = value?.replace(/\s+/g, ' ').trim();
  return v ? v : null;
}

function fmtDate(d: string): string {
  return d.split('-').reverse().join('/');
}
