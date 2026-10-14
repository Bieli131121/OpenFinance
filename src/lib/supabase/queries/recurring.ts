import { createClient } from '@/lib/supabase/server';
export interface RecurringTransaction { id: string; name: string; amount: number; frequency: string; due_day: number | null; account_id: string | null; active: boolean; category?: { id: string; name: string; icon: string | null; kind: string } | null; }
export async function getRecurringTransactions(): Promise<RecurringTransaction[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('recurring_transactions').select('*, category:transaction_categories(id, name, icon, kind)').order('due_day', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as RecurringTransaction[];
}
export async function createRecurring(input: { name: string; amount: number; categoryId: string | null; frequency: string; dueDay: number; accountId: string | null }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  const { error } = await supabase.from('recurring_transactions').insert({ user_id: user.id, name: input.name, amount: input.amount, category_id: input.categoryId, frequency: input.frequency, due_day: input.dueDay, account_id: input.accountId, active: true });
  if (error) throw error;
}
export async function toggleRecurring(id: string, active: boolean) {
  const supabase = createClient();
  const { error } = await supabase.from('recurring_transactions').update({ active }).eq('id', id);
  if (error) throw error;
}
export async function deleteRecurring(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('recurring_transactions').delete().eq('id', id);
  if (error) throw error;
}
