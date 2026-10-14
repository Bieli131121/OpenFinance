import { createClient } from '@/lib/supabase/server';
function getInvoiceReferenceMonth(occurredAt: Date, closingDay: number): Date {
  const day = occurredAt.getDate(); const month = occurredAt.getMonth(); const year = occurredAt.getFullYear();
  if (day <= closingDay) return new Date(year, month, 1);
  return new Date(year, month + 1, 1);
}
export async function recalculateCardInvoices(cardId: string) {
  const supabase = createClient();
  const { data: card } = await supabase.from('cards').select('closing_day, due_day, credit_limit').eq('id', cardId).single();
  if (!card || !card.closing_day) return;
  const { data: transactions } = await supabase.from('transactions').select('amount, occurred_at').eq('card_id', cardId).eq('type', 'expense');
  const byMonth = new Map<string, number>();
  for (const tx of transactions ?? []) {
    const refMonth = getInvoiceReferenceMonth(new Date(tx.occurred_at), card.closing_day);
    const key = refMonth.toISOString().slice(0, 10);
    byMonth.set(key, (byMonth.get(key) ?? 0) + Math.abs(Number(tx.amount)));
  }
  const now = new Date();
  const currentMonthKey = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  for (const [referenceMonth, totalAmount] of byMonth.entries()) {
    const { data: existing } = await supabase.from('credit_card_invoices').select('id, status').eq('card_id', cardId).eq('reference_month', referenceMonth).maybeSingle();
    const refDate = new Date(referenceMonth);
    const dueDate = new Date(refDate.getFullYear(), refDate.getMonth(), card.due_day ?? 10).toISOString().slice(0, 10);
    const closingDate = new Date(refDate.getFullYear(), refDate.getMonth(), card.closing_day).toISOString().slice(0, 10);
    if (existing) { if (existing.status === 'paid') continue; await supabase.from('credit_card_invoices').update({ total_amount: totalAmount }).eq('id', existing.id); }
    else { const status = referenceMonth < currentMonthKey ? 'closed' : 'open'; await supabase.from('credit_card_invoices').insert({ card_id: cardId, reference_month: referenceMonth, total_amount: totalAmount, status, due_date: dueDate, closing_date: closingDate }); }
  }
  const { data: openInvoices } = await supabase.from('credit_card_invoices').select('total_amount').eq('card_id', cardId).neq('status', 'paid');
  const committed = (openInvoices ?? []).reduce((s, i) => s + Number(i.total_amount), 0);
  const availableLimit = Math.max(Number(card.credit_limit ?? 0) - committed, 0);
  await supabase.from('cards').update({ available_limit: availableLimit }).eq('id', cardId);
}
