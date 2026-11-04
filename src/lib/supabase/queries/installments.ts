import { createClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';
import { addMonthsClamped, dateOnlyToISO, localParts, monthBounds, monthLabel } from '@/lib/date';
import { fromCents, splitInstallmentsCents, toCents } from '@/lib/money';
import { recalculateCardInvoices } from './invoice-recalc';

export interface InstallmentPurchase {
  groupId: string;
  description: string;
  totalAmount: number;
  installmentTotal: number;
  installmentsPaid: number;
  installmentAmount: number;
  nextInstallmentDate: string | null;
}

/**
 * Cria as N parcelas de uma compra no cartão.
 * `purchaseDate` é 'YYYY-MM-DD'. A parcela i cai no mesmo dia do mês, i meses
 * depois, limitado ao último dia do mês (31/01 -> 28/02 -> 31/03). O código
 * antigo usava `setMonth`, que transformava 31/01 + 1 mês em 03/03 e deixava
 * fevereiro sem parcela.
 */
export async function createCardPurchase(input: {
  cardId: string; description: string; totalAmount: number; installments: number; purchaseDate: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  const groupId = randomUUID();
  // Centavos inteiros: a soma das parcelas é SEMPRE igual ao total.
  const amounts = splitInstallmentsCents(toCents(input.totalAmount), input.installments);

  const rows = amounts.map((cents, i) => ({
    user_id: user.id,
    card_id: input.cardId,
    description_raw: input.description,
    description_normalized: input.description.trim().toUpperCase(),
    amount: -fromCents(cents),
    type: 'expense' as const,
    occurred_at: dateOnlyToISO(addMonthsClamped(input.purchaseDate, i)),
    installment_number: i + 1,
    installment_total: input.installments,
    installment_group_id: groupId,
  }));

  const { error } = await supabase.from('transactions').insert(rows);
  if (error) throw error;

  // Recalcula as faturas afetadas por essa compra (uma por mês de parcela).
  await recalculateCardInvoices(input.cardId);

  return { groupId };
}

export async function getInstallmentPurchasesByCard(cardId: string): Promise<InstallmentPurchase[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('transactions')
    .select('installment_group_id, description_raw, amount, installment_number, installment_total, occurred_at')
    .eq('card_id', cardId)
    .not('installment_group_id', 'is', null)
    .order('occurred_at', { ascending: true });

  if (error) throw error;
  if (!data?.length) return [];

  const groups = new Map<string, typeof data>();
  for (const row of data) {
    const key = row.installment_group_id!;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  const now = new Date();
  const result: InstallmentPurchase[] = [];

  for (const [groupId, rows] of groups.entries()) {
    const totalAmount = rows.reduce((s, r) => s + Math.abs(Number(r.amount)), 0);
    const paid = rows.filter((r) => new Date(r.occurred_at) <= now).length;
    const future = rows.filter((r) => new Date(r.occurred_at) > now).sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));

    result.push({
      groupId,
      description: rows[0].description_raw,
      totalAmount,
      installmentTotal: rows[0].installment_total ?? rows.length,
      installmentsPaid: paid,
      installmentAmount: Math.abs(Number(rows[0].amount)),
      nextInstallmentDate: future[0]?.occurred_at ?? null,
    });
  }

  return result;
}

export interface FutureInstallmentMonth { label: string; amount: number }

/** Total de parcelas de cartão que vencem em cada um dos próximos `months` meses (a partir do atual). */
export async function getFutureInstallmentsCommitment(months = 6): Promise<FutureInstallmentMonth[]> {
  const supabase = createClient();
  const rangeStart = monthBounds(0).start;
  const rangeEnd = monthBounds(months - 1).end;

  const { data, error } = await supabase
    .from('transactions')
    .select('amount, occurred_at')
    .not('installment_group_id', 'is', null)
    .gte('occurred_at', rangeStart)
    .lt('occurred_at', rangeEnd);
  if (error) throw error;

  const nowParts = localParts();
  const currentIndex = nowParts.year * 12 + (nowParts.month - 1);
  const cents = Array<number>(months).fill(0);
  for (const t of data ?? []) {
    const p = localParts(new Date(t.occurred_at));
    const i = p.year * 12 + (p.month - 1) - currentIndex;
    if (i >= 0 && i < months) cents[i] += toCents(Math.abs(Number(t.amount)));
  }

  return cents.map((c, i) => ({ label: monthLabel(i), amount: fromCents(c) }));
}
