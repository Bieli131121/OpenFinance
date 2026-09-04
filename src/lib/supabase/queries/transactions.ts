import { createClient } from '@/lib/supabase/server';
import type { Transaction, TransactionType } from '@/types/database';
import { suggestCategoryName } from '@/lib/categorization';
import { applyUserRules } from './rules';

export interface TransactionFilters {
  search?: string; type?: TransactionType; accountId?: string; from?: string; to?: string;
}

export async function getTransactions(filters: TransactionFilters = {}, limit = 100): Promise<Transaction[]> {
  const supabase = createClient();
  let query = supabase
    .from('transactions')
    .select('*, category:transaction_categories(id, user_id, name, icon, kind)')
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (filters.search) query = query.ilike('description_raw', `%${filters.search}%`);
  if (filters.type) query = query.eq('type', filters.type);
  if (filters.accountId) query = query.eq('account_id', filters.accountId);
  if (filters.from) query = query.gte('occurred_at', filters.from);
  if (filters.to) query = query.lte('occurred_at', filters.to);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Transaction[];
}

export async function getMonthlyIncomeExpense(): Promise<{ income: number; expense: number }> {
  const supabase = createClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { data, error } = await supabase.from('transactions').select('amount, type').gte('occurred_at', monthStart).in('type', ['income', 'expense']);
  if (error) throw error;
  const income = (data ?? []).filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expense = (data ?? []).filter((t) => t.type === 'expense').reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  return { income, expense };
}

async function adjustAccountBalance(supabase: ReturnType<typeof createClient>, accountId: string, delta: number) {
  const { data: lastBalance } = await supabase
    .from('account_balances').select('current_balance').eq('account_id', accountId)
    .order('recorded_at', { ascending: false }).limit(1).maybeSingle();
  const newBalance = Number(lastBalance?.current_balance ?? 0) + delta;
  await supabase.from('account_balances').insert({ account_id: accountId, current_balance: newBalance, available_balance: newBalance });
}

export async function createTransaction(input: {
  accountId: string; description: string; amount: number; type: TransactionType; occurredAt: string; notes?: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  // Regras do usuário têm prioridade; se nenhuma bater, cai no fallback padrão por palavra-chave.
  let categoryId: string | null = await applyUserRules(input.description);
  if (!categoryId) {
    const suggested = suggestCategoryName(input.description);
    if (suggested) {
      const { data: cat } = await supabase.from('transaction_categories').select('id').eq('name', suggested).is('user_id', null).maybeSingle();
      categoryId = cat?.id ?? null;
    }
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id, account_id: input.accountId, description_raw: input.description,
      description_normalized: input.description.trim().toUpperCase(), amount: input.amount,
      type: input.type, occurred_at: input.occurredAt, category_id: categoryId, notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  await adjustAccountBalance(supabase, input.accountId, input.amount);
  return data;
}

/**
 * Edita uma transação existente. Se o valor mudou, ajusta o saldo da conta
 * pela diferença (delta = novo - antigo) em vez de recalcular tudo do zero
 * -- simples e correto para o caso comum de corrigir um valor digitado errado.
 */
export async function updateTransaction(id: string, input: { description: string; amount: number; occurredAt: string }) {
  const supabase = createClient();
  const { data: existing, error: fetchError } = await supabase.from('transactions').select('account_id, amount').eq('id', id).single();
  if (fetchError) throw fetchError;

  const { error } = await supabase.from('transactions').update({
    description_raw: input.description,
    description_normalized: input.description.trim().toUpperCase(),
    amount: input.amount,
    occurred_at: input.occurredAt,
  }).eq('id', id);
  if (error) throw error;

  if (existing.account_id) {
    const delta = input.amount - Number(existing.amount);
    if (delta !== 0) await adjustAccountBalance(supabase, existing.account_id, delta);
  }
}

export async function deleteTransaction(id: string) {
  const supabase = createClient();
  const { data: tx, error: fetchError } = await supabase.from('transactions').select('account_id, amount').eq('id', id).single();
  if (fetchError) throw fetchError;

  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;

  if (tx.account_id) await adjustAccountBalance(supabase, tx.account_id, -Number(tx.amount));
}
