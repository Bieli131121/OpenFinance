import { createClient } from '@/lib/supabase/server';
import { getTotalBalance } from './accounts';

export interface CashFlowMonth {
  label: string;
  startBalance: number;
  income: number;
  expenses: number;
  endBalance: number;
}

/**
 * Previsão simplificada: parte do saldo atual e projeta meses futuros somando
 * receitas/despesas recorrentes ativas, parcelas de dívidas/financiamentos em
 * aberto, e agora também as parcelas de compras no cartão já cadastradas
 * (installment_group_id) -- essa última parte só ficou possível depois do
 * módulo de compras parceladas.
 */
export async function getCashFlowForecast(months = 6): Promise<CashFlowMonth[]> {
  const supabase = createClient();

  const [{ data: recurring }, { data: loans }, { data: financings }] = await Promise.all([
    supabase.from('recurring_transactions').select('amount, category:transaction_categories(kind)').eq('active', true),
    supabase.from('loans').select('installment_amount, installments_total, installments_paid'),
    supabase.from('financings').select('installment_amount, term_months, installments_paid'),
  ]);

  const monthlyRecurringIncome = (recurring ?? [])
    .filter((r: any) => r.category?.kind === 'income')
    .reduce((s: number, r: any) => s + Number(r.amount), 0);

  const monthlyRecurringExpense = (recurring ?? [])
    .filter((r: any) => !r.category || r.category.kind !== 'income')
    .reduce((s: number, r: any) => s + Math.abs(Number(r.amount)), 0);

  let balance = await getTotalBalance();
  const result: CashFlowMonth[] = [];
  const now = new Date();

  for (let i = 0; i < months; i++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
    const monthsFromNow = i;

    const loanInstallments = (loans ?? [])
      .filter((l) => l.installments_paid + monthsFromNow < l.installments_total)
      .reduce((s, l) => s + Number(l.installment_amount), 0);

    const financingInstallments = (financings ?? [])
      .filter((f) => f.installments_paid + monthsFromNow < f.term_months)
      .reduce((s, f) => s + Number(f.installment_amount), 0);

    const { data: cardInstallments } = await supabase
      .from('transactions')
      .select('amount')
      .not('installment_group_id', 'is', null)
      .gte('occurred_at', monthDate.toISOString())
      .lt('occurred_at', monthEnd.toISOString());

    const cardInstallmentTotal = (cardInstallments ?? []).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);

    const income = monthlyRecurringIncome;
    const expenses = monthlyRecurringExpense + loanInstallments + financingInstallments + cardInstallmentTotal;
    const startBalance = balance;
    const endBalance = startBalance + income - expenses;

    result.push({
      label: monthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      startBalance, income, expenses, endBalance,
    });

    balance = endBalance;
  }

  return result;
}
