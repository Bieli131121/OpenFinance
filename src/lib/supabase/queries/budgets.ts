import { createClient } from '@/lib/supabase/server';
import { monthBounds, monthStartDate } from '@/lib/date';

export interface BudgetCategoryProgress {
  categoryId: string;
  categoryName: string;
  icon: string | null;
  limitAmount: number;
  spentAmount: number;
}

function currentMonthDate(): string {
  return monthStartDate(0);
}

export async function getCurrentBudget(): Promise<BudgetCategoryProgress[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const referenceMonth = currentMonthDate();

  const { data: budget } = await supabase
    .from('budgets')
    .select('id')
    .eq('reference_month', referenceMonth)
    .maybeSingle();

  if (!budget) return [];

  const { data: budgetCategories, error } = await supabase
    .from('budget_categories')
    .select('category_id, limit_amount, category:transaction_categories(id, name, icon)')
    .eq('budget_id', budget.id);
  if (error) throw error;
  if (!budgetCategories?.length) return [];

  const { start, end } = monthBounds(0);
  const { data: transactions } = await supabase
    .from('transactions')
    .select('category_id, amount')
    .eq('type', 'expense')
    .gte('occurred_at', start)
    .lt('occurred_at', end); // limite superior: parcelas futuras não contam no gasto do mês

  return budgetCategories.map((bc: any) => {
    const spent = (transactions ?? [])
      .filter((t) => t.category_id === bc.category_id)
      .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
    return {
      categoryId: bc.category_id,
      categoryName: bc.category?.name ?? 'Categoria',
      icon: bc.category?.icon ?? null,
      limitAmount: Number(bc.limit_amount),
      spentAmount: spent,
    };
  });
}

export async function setBudgetCategoryLimit(categoryId: string, limitAmount: number) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  const referenceMonth = currentMonthDate();

  // upsert (e não "consulta, depois insere"): dois envios simultâneos não criam orçamento duplicado.
  const { data: budget, error: budgetError } = await supabase
    .from('budgets')
    .upsert({ user_id: user.id, reference_month: referenceMonth }, { onConflict: 'user_id,reference_month' })
    .select('id')
    .single();
  if (budgetError) throw budgetError;

  const { error } = await supabase
    .from('budget_categories')
    .upsert({ budget_id: budget.id, category_id: categoryId, limit_amount: limitAmount }, { onConflict: 'budget_id,category_id' });
  if (error) throw error;
}

export async function getExpenseCategories() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('transaction_categories')
    .select('id, name, icon')
    .eq('kind', 'expense')
    .is('user_id', null)
    .order('name');
  if (error) throw error;
  return data ?? [];
}
