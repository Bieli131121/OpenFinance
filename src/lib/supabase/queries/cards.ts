import { createClient } from '@/lib/supabase/server';
import type { Card, CreditCardInvoice } from '@/types/database';
export interface CardWithCurrentInvoice extends Card { current_invoice: CreditCardInvoice | null; }
export async function getCardsWithInvoices(): Promise<CardWithCurrentInvoice[]> {
  const supabase = createClient();
  const { data: cards, error } = await supabase.from('cards').select('*').eq('archived', false).order('created_at', { ascending: true });
  if (error) throw error;
  if (!cards?.length) return [];
  const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
  const { data: invoices } = await supabase.from('credit_card_invoices').select('*').in('card_id', cards.map((c) => c.id)).eq('reference_month', currentMonth);
  return cards.map((card) => ({ ...card, current_invoice: invoices?.find((i) => i.card_id === card.id) ?? null }));
}
export async function createManualCard(input: { name: string; brand?: string; lastFour?: string; creditLimit: number; closingDay: number; dueDay: number }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  const { data: card, error } = await supabase.from('cards').insert({ user_id: user.id, name: input.name, brand: input.brand ?? null, last_four: input.lastFour ?? null, credit_limit: input.creditLimit, available_limit: input.creditLimit, closing_day: input.closingDay, due_day: input.dueDay }).select().single();
  if (error) throw error;
  return card;
}
export async function archiveCard(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('cards').update({ archived: true }).eq('id', id);
  if (error) throw error;
}
export async function payInvoice(invoiceId: string, accountId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  const { data: invoice, error: invoiceError } = await supabase.from('credit_card_invoices').select('id, card_id, total_amount, reference_month').eq('id', invoiceId).single();
  if (invoiceError) throw invoiceError;
  const { data: card } = await supabase.from('cards').select('name').eq('id', invoice.card_id).single();
  await supabase.from('transactions').insert({ user_id: user.id, account_id: accountId, description_raw: `Pagamento fatura ${card?.name ?? 'cartão'}`, description_normalized: 'PAGAMENTO FATURA', amount: -Math.abs(Number(invoice.total_amount)), type: 'card_payment', occurred_at: new Date().toISOString() });
  const { data: lastBalance } = await supabase.from('account_balances').select('current_balance').eq('account_id', accountId).order('recorded_at', { ascending: false }).limit(1).maybeSingle();
  const newBalance = Number(lastBalance?.current_balance ?? 0) - Number(invoice.total_amount);
  await supabase.from('account_balances').insert({ account_id: accountId, current_balance: newBalance, available_balance: newBalance });
  await supabase.from('credit_card_invoices').update({ status: 'paid' }).eq('id', invoiceId);
  const { data: cardData } = await supabase.from('cards').select('credit_limit').eq('id', invoice.card_id).single();
  const { data: openInvoices } = await supabase.from('credit_card_invoices').select('total_amount').eq('card_id', invoice.card_id).neq('status', 'paid');
  const committed = (openInvoices ?? []).reduce((s, i) => s + Number(i.total_amount), 0);
  const availableLimit = Math.max(Number(cardData?.credit_limit ?? 0) - committed, 0);
  await supabase.from('cards').update({ available_limit: availableLimit }).eq('id', invoice.card_id);
}
