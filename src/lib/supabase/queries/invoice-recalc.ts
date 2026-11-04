import { createClient } from '@/lib/supabase/server';
import { addMonthsClamped, clampedDate, localParts, monthStartDate, parseDateOnly } from '@/lib/date';

/**
 * Determina a qual fatura (mês de referência, 'YYYY-MM-01') uma compra pertence:
 * compras até o dia de fechamento entram na fatura do mês; depois disso, rolam
 * para a seguinte. O dia/mês é o do fuso do Brasil (não o do servidor, que é UTC).
 */
export function getInvoiceReferenceMonth(occurredAt: Date, closingDay: number): string {
  const { year, month, day } = localParts(occurredAt);
  const first = `${year}-${String(month).padStart(2, '0')}-01`;
  return day <= closingDay ? first : addMonthsClamped(first, 1);
}

/** Fechamento e vencimento de uma fatura. Se o vencimento é <= dia de fechamento, cai no mês seguinte. */
export function getInvoiceDates(referenceMonth: string, closingDay: number, dueDay: number) {
  const ref = parseDateOnly(referenceMonth)!;
  const closingDate = clampedDate(ref.year, ref.month, closingDay);
  const dueBase = dueDay <= closingDay ? addMonthsClamped(referenceMonth, 1) : referenceMonth;
  const due = parseDateOnly(dueBase)!;
  return { closingDate, dueDate: clampedDate(due.year, due.month, dueDay) };
}

/**
 * Recalcula todas as faturas de um cartão a partir das transações reais
 * ligadas a ele (card_id), agrupando por mês de referência conforme o dia
 * de fechamento. Chamado sempre que uma transação de cartão é criada,
 * editada ou excluída.
 *
 * Não sobrescreve o status de uma fatura já marcada como "paid" -- só atualiza
 * o total_amount e cria faturas novas como "open"/"closed".
 */
export async function recalculateCardInvoices(cardId: string) {
  const supabase = createClient();

  const { data: card } = await supabase
    .from('cards')
    .select('closing_day, due_day, credit_limit')
    .eq('id', cardId)
    .single();
  if (!card || !card.closing_day) return;

  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount, occurred_at')
    .eq('card_id', cardId)
    .eq('type', 'expense');

  const byMonth = new Map<string, number>();
  for (const tx of transactions ?? []) {
    const key = getInvoiceReferenceMonth(new Date(tx.occurred_at), card.closing_day);
    // Em centavos, para não acumular erro de ponto flutuante.
    byMonth.set(key, (byMonth.get(key) ?? 0) + Math.round(Math.abs(Number(tx.amount)) * 100));
  }

  const { data: existingInvoices } = await supabase
    .from('credit_card_invoices')
    .select('id, status, reference_month')
    .eq('card_id', cardId);
  const existingByMonth = new Map((existingInvoices ?? []).map((i) => [String(i.reference_month).slice(0, 10), i]));

  const currentMonthKey = monthStartDate(0);
  const dueDay = card.due_day ?? 10;

  for (const [referenceMonth, cents] of byMonth.entries()) {
    const totalAmount = cents / 100;
    const existing = existingByMonth.get(referenceMonth);

    if (existing) {
      if (existing.status === 'paid') continue; // não mexe em fatura já paga
      await supabase.from('credit_card_invoices').update({ total_amount: totalAmount }).eq('id', existing.id);
    } else {
      const { closingDate, dueDate } = getInvoiceDates(referenceMonth, card.closing_day, dueDay);
      const status = referenceMonth < currentMonthKey ? 'closed' : 'open';
      await supabase.from('credit_card_invoices').insert({
        card_id: cardId, reference_month: referenceMonth, total_amount: totalAmount,
        status, due_date: dueDate, closing_date: closingDate,
      });
    }
  }

  // Faturas que ficaram sem nenhuma compra (compra excluída): zera, se ainda não paga.
  for (const [month, inv] of existingByMonth.entries()) {
    if (!byMonth.has(month) && inv.status !== 'paid') {
      await supabase.from('credit_card_invoices').update({ total_amount: 0 }).eq('id', inv.id);
    }
  }

  // Limite disponível = limite total - soma das faturas ainda não pagas.
  const { data: openInvoices } = await supabase
    .from('credit_card_invoices')
    .select('total_amount')
    .eq('card_id', cardId)
    .neq('status', 'paid');

  const committed = (openInvoices ?? []).reduce((s, i) => s + Number(i.total_amount), 0);
  const availableLimit = Math.max(Number(card.credit_limit ?? 0) - committed, 0);

  await supabase.from('cards').update({ available_limit: availableLimit }).eq('id', cardId);
}
