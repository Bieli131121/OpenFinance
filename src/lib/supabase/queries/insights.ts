import { createClient } from '@/lib/supabase/server';
export interface Insight { message: string; tone: 'positive' | 'negative' | 'neutral'; }
function monthRange(offset: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
  return { start: start.toISOString(), end: end.toISOString() };
}
export async function getInsights(): Promise<Insight[]> {
  const supabase = createClient();
  const insights: Insight[] = [];
  const thisMonth = monthRange(0);
  const lastMonth = monthRange(-1);
  const { data: thisMonthTx } = await supabase.from('transactions').select('amount, type, category:transaction_categories(name)').eq('type', 'expense').gte('occurred_at', thisMonth.start).lt('occurred_at', thisMonth.end);
  const { data: lastMonthTx } = await supabase.from('transactions').select('amount, type, category:transaction_categories(name)').eq('type', 'expense').gte('occurred_at', lastMonth.start).lt('occurred_at', lastMonth.end);
  const sumByCategory = (rows: any[] | null) => {
    const map = new Map<string, number>();
    (rows ?? []).forEach((r) => { const name = r.category?.name ?? 'Sem categoria'; map.set(name, (map.get(name) ?? 0) + Math.abs(Number(r.amount))); });
    return map;
  };
  const thisMap = sumByCategory(thisMonthTx);
  const lastMap = sumByCategory(lastMonthTx);
  for (const [category, thisValue] of thisMap.entries()) {
    const lastValue = lastMap.get(category) ?? 0;
    if (lastValue > 0) {
      const changePct = ((thisValue - lastValue) / lastValue) * 100;
      if (Math.abs(changePct) >= 20) insights.push({ message: `Seus gastos com ${category} ${changePct > 0 ? 'aumentaram' : 'diminuíram'} ${Math.abs(changePct).toFixed(0)}% em relação ao mês anterior.`, tone: changePct > 0 ? 'negative' : 'positive' });
    }
  }
  const { data: cardTx } = await supabase.from('transactions').select('amount').eq('type', 'expense').not('card_id', 'is', null).gte('occurred_at', thisMonth.start).lt('occurred_at', thisMonth.end);
  const totalExpense = Array.from(thisMap.values()).reduce((s, v) => s + v, 0);
  const cardExpense = (cardTx ?? []).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  if (totalExpense > 0 && cardExpense > 0) { const share = (cardExpense / totalExpense) * 100; insights.push({ message: `Seu cartão representa ${share.toFixed(0)}% das suas despesas este mês.`, tone: 'neutral' }); }
  const { data: loans } = await supabase.from('loans').select('installment_amount, installments_total, installments_paid');
  const { data: financings } = await supabase.from('financings').select('installment_amount, term_months, installments_paid');
  const committed = (loans ?? []).filter((l) => l.installments_paid < l.installments_total).reduce((s, l) => s + Number(l.installment_amount), 0) + (financings ?? []).filter((f) => f.installments_paid < f.term_months).reduce((s, f) => s + Number(f.installment_amount), 0);
  if (committed > 0) insights.push({ message: `Você tem ${committed.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em parcelas comprometidas no próximo mês.`, tone: 'neutral' });
  return insights;
}
