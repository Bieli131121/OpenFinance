import { createClient } from '@/lib/supabase/server';
import type { Card, CreditCardInvoice } from '@/types/database';
import { monthStartDate } from '@/lib/date';

export interface CardWithCurrentInvoice extends Card {
  current_invoice: CreditCardInvoice | null;
}

export async function getCardsWithInvoices(): Promise<CardWithCurrentInvoice[]> {
  const supabase = createClient();
  const { data: cards, error } = await supabase
    .from('cards')
    .select('*')
    .eq('archived', false)
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!cards?.length) return [];

  const currentMonth = monthStartDate(0);
  const { data: invoices } = await supabase
    .from('credit_card_invoices')
    .select('*')
    .in('card_id', cards.map((c) => c.id))
    .eq('reference_month', currentMonth);

  return cards.map((card) => ({
    ...card,
    current_invoice: invoices?.find((i) => i.card_id === card.id) ?? null,
  }));
}

export async function createManualCard(input: {
  name: string; brand?: string; lastFour?: string; creditLimit: number; closingDay: number; dueDay: number;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  const { data: card, error } = await supabase
    .from('cards')
    .insert({
      user_id: user.id, name: input.name, brand: input.brand ?? null, last_four: input.lastFour ?? null,
      credit_limit: input.creditLimit, available_limit: input.creditLimit,
      closing_day: input.closingDay, due_day: input.dueDay,
    })
    .select()
    .single();
  if (error) throw error;
  return card;
}

export async function archiveCard(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('cards').update({ archived: true }).eq('id', id);
  if (error) throw error;
}

/**
 * Paga a fatura: débito na conta, saldo, status da fatura e limite do cartão
 * acontecem numa única transação do banco (função SQL pay_invoice). Pagar duas
 * vezes (duplo clique, duas abas) falha na segunda tentativa.
 */
export async function payInvoice(invoiceId: string, accountId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc('pay_invoice', { p_invoice_id: invoiceId, p_account_id: accountId });
  if (error) throw new Error(error.message);
}
