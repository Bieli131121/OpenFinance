import { createClient } from '@/lib/supabase/server';
import { getTotalBalance } from './accounts';
import { localParts, monthBounds, monthLabel } from '@/lib/date';
import { fromCents, toCents } from '@/lib/money';

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
 * aberto, as parcelas de compras no cartão já cadastradas (installment_group_id)
 * e os boletos pendentes (pelo mês de vencimento).
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

  // Parcelas de cartão do período inteiro numa consulta só (antes: 1 consulta por mês).
  const { data: cardRows } = await supabase
    .from('transactions')
    .select('amount, occurred_at')
    .not('installment_group_id', 'is', null)
    .gte('occurred_at', monthBounds(0).start)
    .lt('occurred_at', monthBounds(months - 1).end);

  const nowParts = localParts();
  const currentIndex = nowParts.year * 12 + (nowParts.month - 1);
  const cardCentsByMonth = Array<number>(months).fill(0);
  for (const t of cardRows ?? []) {
    const p = localParts(new Date(t.occurred_at));
    const i = p.year * 12 + (p.month - 1) - currentIndex;
    if (i >= 0 && i < months) cardCentsByMonth[i] += toCents(Math.abs(Number(t.amount)));
  }

  // Boletos a pagar (ainda pendentes) entram no mês do vencimento.
  const { data: billRows } = await supabase
    .from('payable_bills')
    .select('amount, due_date')
    .eq('status', 'pending')
    .gte('due_date', monthBounds(0).startDate)
    .lt('due_date', monthBounds(months - 1).endDate);
  const billCentsByMonth = Array<number>(months).fill(0);
  for (const b of billRows ?? []) {
    const [y, m] = String(b.due_date).split('-').map(Number);
    const i = y * 12 + (m - 1) - currentIndex;
    if (i >= 0 && i < months) billCentsByMonth[i] += toCents(Number(b.amount));
  }

  let balance = await getTotalBalance();
  const result: CashFlowMonth[] = [];

  for (let i = 0; i < months; i++) {
    const monthsFromNow = i;

    const loanInstallments = (loans ?? [])
      .filter((l) => l.installments_paid + monthsFromNow < l.installments_total)
      .reduce((s, l) => s + Number(l.installment_amount), 0);

    const financingInstallments = (financings ?? [])
      .filter((f) => f.installments_paid + monthsFromNow < f.term_months)
      .reduce((s, f) => s + Number(f.installment_amount), 0);

    const cardInstallmentTotal = fromCents(cardCentsByMonth[i]);

    const income = monthlyRecurringIncome;
    const expenses = monthlyRecurringExpense + loanInstallments + financingInstallments + cardInstallmentTotal + fromCents(billCentsByMonth[i]);
    const startBalance = balance;
    const endBalance = startBalance + income - expenses;

    result.push({ label: monthLabel(i), startBalance, income, expenses, endBalance });

    balance = endBalance;
  }

  return result;
}
