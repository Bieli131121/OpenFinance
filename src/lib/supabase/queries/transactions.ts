import { createClient } from '@/lib/supabase/server';
import type { Transaction, TransactionType } from '@/types/database';
import { suggestCategoryName } from '@/lib/categorization';
import { dateOnlyToStartISO, isValidDateOnly, monthBounds, nextDayDate } from '@/lib/date';
import { applyUserRules } from './rules';
import { recalculateCardInvoices } from './invoice-recalc';

export interface TransactionFilters {
  search?: string; type?: TransactionType; accountId?: string;
  /** 'YYYY-MM-DD' — início do dia (inclusive). */
  from?: string;
  /** 'YYYY-MM-DD' — fim do dia (inclusive). */
  to?: string;
}

/** Escapa curingas do ILIKE para que a busca por "50%" ou "a_b" seja literal. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function getTransactions(filters: TransactionFilters = {}, limit = 100): Promise<Transaction[]> {
  const supabase = createClient();
  let query = supabase
    .from('transactions')
    .select('*, category:transaction_categories(id, user_id, name, icon, kind)')
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (filters.search) query = query.ilike('description_raw', `%${escapeLike(filters.search)}%`);
  if (filters.type) query = query.eq('type', filters.type);
  if (filters.accountId) query = query.eq('account_id', filters.accountId);
  // "até 31/10" precisa incluir TODO o dia 31: o limite superior é o início do dia seguinte (exclusivo).
  if (filters.from && isValidDateOnly(filters.from)) query = query.gte('occurred_at', dateOnlyToStartISO(filters.from));
  if (filters.to && isValidDateOnly(filters.to)) query = query.lt('occurred_at', dateOnlyToStartISO(nextDayDate(filters.to)));

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Transaction[];
}

export async function getMonthlyIncomeExpense(): Promise<{ income: number; expense: number }> {
  const supabase = createClient();
  const { start, end } = monthBounds(0);
  const { data, error } = await supabase
    .from('transactions')
    .select('amount, type')
    .gte('occurred_at', start)
    .lt('occurred_at', end) // sem isso, parcelas e lançamentos futuros entravam no mês atual
    .in('type', ['income', 'expense']);
  if (error) throw error;
  const income = (data ?? []).filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expense = (data ?? []).filter((t) => t.type === 'expense').reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  return { income, expense };
}

/**
 * Cria a transação E ajusta o saldo da conta numa única transação do banco
 * (função SQL create_transaction_with_balance, que trava a conta). Se qualquer
 * parte falhar, nada é gravado.
 */
export async function createTransaction(input: {
  accountId: string; description: string; amount: number; type: TransactionType; occurredAt: string; notes?: string;
}) {
  const supabase = createClient();

  // Regras do usuário têm prioridade; se nenhuma bater, cai no fallback padrão por palavra-chave.
  let categoryId: string | null = await applyUserRules(input.description);
  if (!categoryId) {
    const suggested = suggestCategoryName(input.description);
    if (suggested) {
      const { data: cat } = await supabase.from('transaction_categories').select('id').eq('name', suggested).is('user_id', null).maybeSingle();
      categoryId = cat?.id ?? null;
    }
  }

  const { data, error } = await supabase.rpc('create_transaction_with_balance', {
    p_account_id: input.accountId,
    p_description: input.description,
    p_amount: input.amount,
    p_type: input.type,
    p_occurred_at: input.occurredAt,
    p_category_id: categoryId,
    p_notes: input.notes ?? null,
  });
  if (error) throw new Error(error.message);
  return data as { id: string };
}

/**
 * Edita uma transação. O ajuste do saldo (novo - antigo) acontece na mesma
 * transação do banco (função SQL update_transaction_with_balance).
 */
export async function updateTransaction(id: string, input: { description: string; amount: number; occurredAt: string }) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('update_transaction_with_balance', {
    p_id: id, p_description: input.description, p_amount: input.amount, p_occurred_at: input.occurredAt,
  });
  if (error) throw new Error(error.message);

  // Parcela de cartão editada: o total da fatura muda.
  const cardId = (data as { card_id?: string | null } | null)?.card_id;
  if (cardId) await recalculateCardInvoices(cardId);
}

export async function deleteTransaction(id: string) {
  const supabase = createClient();
  const { data: existing } = await supabase.from('transactions').select('card_id').eq('id', id).maybeSingle();

  const { error } = await supabase.rpc('delete_transaction_with_balance', { p_id: id });
  if (error) throw new Error(error.message);

  if (existing?.card_id) await recalculateCardInvoices(existing.card_id);
}
