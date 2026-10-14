import { createClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';
import { recalculateCardInvoices } from './invoice-recalc';
export interface InstallmentPurchase { groupId: string; description: string; totalAmount: number; installmentTotal: number; installmentsPaid: number; installmentAmount: number; nextInstallmentDate: string | null; }
export async function createCardPurchase(input: { cardId: string; description: string; totalAmount: number; installments: number; purchaseDate: string }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  const groupId = randomUUID();
  const baseAmount = Math.floor((input.totalAmount / input.installments) * 100) / 100;
  const lastAmount = Math.round((input.totalAmount - baseAmount * (input.installments - 1)) * 100) / 100;
  const rows = Array.from({ length: input.installments }, (_, i) => {
    const installmentDate = new Date(input.purchaseDate);
    installmentDate.setMonth(installmentDate.getMonth() + i);
    const amount = i === input.installments - 1 ? lastAmount : baseAmount;
    return { user_id: user.id, card_id: input.cardId, description_raw: input.description, description_normalized: input.description.trim().toUpperCase(), amount: -Math.abs(amount), type: 'expense' as const, occurred_at: installmentDate.toISOString(), installment_number: i + 1, installment_total: input.installments, installment_group_id: groupId };
  });
  const { error } = await supabase.from('transactions').insert(rows);
  if (error) throw error;
  await recalculateCardInvoices(input.cardId);
  return { groupId };
}
export async function getInstallmentPurchasesByCard(cardId: string): Promise<InstallmentPurchase[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('transactions').select('installment_group_id, description_raw, amount, installment_number, installment_total, occurred_at').eq('card_id', cardId).not('installment_group_id', 'is', null).order('occurred_at', { ascending: true });
  if (error) throw error;
  if (!data?.length) return [];
  const groups = new Map<string, typeof data>();
  for (const row of data) { const key = row.installment_group_id!; if (!groups.has(key)) groups.set(key, []); groups.get(key)!.push(row); }
  const now = new Date();
  const result: InstallmentPurchase[] = [];
  for (const [groupId, rows] of groups.entries()) {
    const totalAmount = rows.reduce((s, r) => s + Math.abs(Number(r.amount)), 0);
    const paid = rows.filter((r) => new Date(r.occurred_at) <= now).length;
    const future = rows.filter((r) => new Date(r.occurred_at) > now).sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
    result.push({ groupId, description: rows[0].description_raw, totalAmount, installmentTotal: rows[0].installment_total ?? rows.length, installmentsPaid: paid, installmentAmount: Math.abs(Number(rows[0].amount)), nextInstallmentDate: future[0]?.occurred_at ?? null });
  }
  return result;
}
export interface FutureInstallmentMonth { label: string; amount: number; }
export async function getFutureInstallmentsCommitment(months = 6): Promise<FutureInstallmentMonth[]> {
  const supabase = createClient();
  const now = new Date();
  const result: FutureInstallmentMonth[] = [];
  for (let i = 0; i < months; i++) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
    const { data } = await supabase.from('transactions').select('amount').not('installment_group_id', 'is', null).gte('occurred_at', monthStart.toISOString()).lt('occurred_at', monthEnd.toISOString());
    const amount = (data ?? []).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
    result.push({ label: monthStart.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }), amount });
  }
  return result;
}
