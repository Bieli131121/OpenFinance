import { createClient } from '@/lib/supabase/server';

export interface FinancialGoal {
  id: string; name: string; kind: string | null; target_amount: number; current_amount: number; target_date: string | null;
}

export async function getGoals(): Promise<FinancialGoal[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('financial_goals').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createGoal(input: { name: string; kind: string; targetAmount: number; currentAmount: number; targetDate: string | null }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  const { error } = await supabase.from('financial_goals').insert({
    user_id: user.id, name: input.name, kind: input.kind, target_amount: input.targetAmount,
    current_amount: input.currentAmount, target_date: input.targetDate,
  });
  if (error) throw error;
}

/** Edição mais comum: atualizar quanto já foi guardado (e opcionalmente o objetivo/data). */
export async function updateGoal(id: string, input: { currentAmount: number; targetAmount: number; targetDate: string | null }) {
  const supabase = createClient();
  const { error } = await supabase.from('financial_goals').update({
    current_amount: input.currentAmount, target_amount: input.targetAmount, target_date: input.targetDate,
  }).eq('id', id);
  if (error) throw error;
}

export async function deleteGoal(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('financial_goals').delete().eq('id', id);
  if (error) throw error;
}
