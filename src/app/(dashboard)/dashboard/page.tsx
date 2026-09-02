import { SummaryCards } from '@/components/dashboard/summary-cards';
import { getOpenFinanceProvider } from '@/lib/open-finance';

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default async function DashboardPage() {
  // TODO: substituir por agregações reais vindas do Supabase (accounts, transactions, invoices, investments, loans)
  const netWorth = 84350;
  const totalBalance = 12450;
  const monthlyIncome = 9850;
  const monthlyExpenses = 6320;
  const invested = 32500;
  const debts = 18200;
  const cardLimit = 15000;
  const currentInvoice = 2840;

  const provider = getOpenFinanceProvider();

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-neutral-500">Patrimônio líquido</p>
        <h1 className="text-3xl font-bold">{formatBRL(netWorth)}</h1>
      </div>

      {!provider && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Open Finance ainda não configurado. Defina <code>OPEN_FINANCE_PROVIDER</code> no .env
          (use <code>mock</code> para o modo demo) para conectar suas instituições.
        </div>
      )}

      <SummaryCards
        cards={[
          { label: 'Saldo total', value: formatBRL(totalBalance) },
          { label: 'Receitas do mês', value: formatBRL(monthlyIncome), tone: 'positive' },
          { label: 'Despesas do mês', value: formatBRL(monthlyExpenses), tone: 'negative' },
          { label: 'Investimentos', value: formatBRL(invested) },
          { label: 'Dívidas', value: formatBRL(debts), tone: 'negative' },
          { label: 'Limite dos cartões', value: formatBRL(cardLimit) },
          { label: 'Fatura atual', value: formatBRL(currentInvoice) },
        ]}
      />
    </div>
  );
}
