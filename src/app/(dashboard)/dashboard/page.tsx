import { SummaryCards } from '@/components/dashboard/summary-cards';
import { InsightsPanel } from '@/components/dashboard/insights-panel';
import { Money } from '@/contexts/privacy-context';
import { getOpenFinanceProvider } from '@/lib/open-finance';
import { getMonthlyIncomeExpense } from '@/lib/supabase/queries/transactions';
import { getCardsWithInvoices } from '@/lib/supabase/queries/cards';
import { getNetWorthBreakdown } from '@/lib/supabase/queries/net-worth';
import { getTotalBalance } from '@/lib/supabase/queries/accounts';
import { getTotalInvested } from '@/lib/supabase/queries/investments';
import { getTotalDebts } from '@/lib/supabase/queries/loans';
import { getInsights } from '@/lib/supabase/queries/insights';

export default async function DashboardPage() {
  const [{ income, expense }, cards, netWorth, totalBalance, invested, debts, insights] = await Promise.all([
    getMonthlyIncomeExpense(),
    getCardsWithInvoices(),
    getNetWorthBreakdown(),
    getTotalBalance(),
    getTotalInvested(),
    getTotalDebts(),
    getInsights(),
  ]);

  const cardLimit = cards.reduce((s, c) => s + Number(c.credit_limit ?? 0), 0);
  const currentInvoices = cards.reduce((s, c) => s + Number(c.current_invoice?.total_amount ?? 0), 0);

  const provider = getOpenFinanceProvider();

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-neutral-500">Patrimônio líquido</p>
        <Money value={netWorth.netWorth} className="block text-3xl font-bold" />
      </div>

      {!provider && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Open Finance ainda não configurado. Defina <code>OPEN_FINANCE_PROVIDER</code> no .env
          (use <code>mock</code> para o modo demo) para conectar suas instituições.
        </div>
      )}

      <SummaryCards
        cards={[
          { label: 'Saldo total', value: totalBalance },
          { label: 'Receitas do mês', value: income, tone: 'positive' },
          { label: 'Despesas do mês', value: expense, tone: 'negative' },
          { label: 'Investimentos', value: invested },
          { label: 'Dívidas', value: debts, tone: 'negative' },
          { label: 'Limite dos cartões', value: cardLimit },
          { label: 'Fatura atual', value: currentInvoices },
        ]}
      />

      <InsightsPanel insights={insights} />
    </div>
  );
}
