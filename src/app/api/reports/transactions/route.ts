import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const rateLimit = await checkRateLimit('report.transactions_csv', 20, 60);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Muitos relatórios gerados recentemente. Tente novamente mais tarde.' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  let query = supabase
    .from('transactions')
    .select('occurred_at, description_raw, amount, type, category:transaction_categories(name)')
    .order('occurred_at', { ascending: true });

  if (from) query = query.gte('occurred_at', from);
  if (to) query = query.lte('occurred_at', to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const header = 'Data,Descrição,Categoria,Tipo,Valor\n';
  const rows = (data ?? [])
    .map((t: any) => {
      const date = new Date(t.occurred_at).toLocaleDateString('pt-BR');
      const desc = `"${String(t.description_raw).replace(/"/g, '""')}"`;
      const category = t.category?.name ?? '';
      return `${date},${desc},${category},${t.type},${t.amount}`;
    })
    .join('\n');

  return new NextResponse(header + rows, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="transacoes.csv"',
    },
  });
}
