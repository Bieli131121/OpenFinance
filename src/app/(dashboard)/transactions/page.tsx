import { getTransactions } from '@/lib/supabase/queries/transactions';
import { getAccountsWithBalances } from '@/lib/supabase/queries/accounts';
import { getFinancialRules } from '@/lib/supabase/queries/rules';
import { getExpenseCategories } from '@/lib/supabase/queries/budgets';
import { addTransactionAction, deleteTransactionAction, updateTransactionAction, addRuleAction, deleteRuleAction } from './actions';
import type { TransactionType } from '@/types/database';
import { DeleteButton } from '@/components/ui/delete-button';
import { InlineEdit } from '@/components/ui/inline-edit';

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
const TYPE_LABELS: Record<string, string> = {
  income: 'Receita', expense: 'Despesa', transfer: 'Transferência',
  investment: 'Investimento', redemption: 'Resgate', card_payment: 'Pagamento de cartão', adjustment: 'Ajuste',
};
const inputClass = "rounded-lg border border-neutral-300 px-2 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-900";

export default async function TransactionsPage({ searchParams }: { searchParams: { search?: string; type?: string } }) {
  const [transactions, accounts, rules, categories] = await Promise.all([
    getTransactions({ search: searchParams.search, type: searchParams.type as TransactionType | undefined }),
    getAccountsWithBalances(), getFinancialRules(), getExpenseCategories(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Transações</h1>

      <form className="flex flex-wrap gap-3" method="GET">
        <input name="search" defaultValue={searchParams.search} placeholder="Pesquisar por descrição..." className="flex-1 min-w-[200px] rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900" />
        <select name="type" defaultValue={searchParams.type ?? ''} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900">
          <option value="">Todos os tipos</option>
          {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button type="submit" className="rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700">Filtrar</button>
      </form>

      <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 className="mb-4 text-lg font-semibold">Nova transação</h2>
        <form action={addTransactionAction} className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          <select name="accountId" required className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900">
            <option value="">Conta</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <input name="description" required placeholder="Descrição (ex: IFOOD)" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 sm:col-span-2" />
          <input name="amount" type="number" step="0.01" required placeholder="Valor" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900" />
          <select name="type" defaultValue="expense" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900">
            <option value="expense">Despesa</option>
            <option value="income">Receita</option>
          </select>
          <input name="occurredAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900" />
          <button type="submit" className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 sm:col-span-4">Adicionar transação</button>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500 dark:bg-neutral-900">
            <tr>
              <th className="px-4 py-3">Data</th><th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3">Categoria</th><th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3 text-right">Valor</th><th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-t border-neutral-100 dark:border-neutral-900">
                <td className="px-4 py-3 whitespace-nowrap">{new Date(tx.occurred_at).toLocaleDateString('pt-BR')}</td>
                <td className="px-4 py-3">
                  {tx.description_raw}
                  <InlineEdit action={updateTransactionAction} id={tx.id}>
                    <input name="description" defaultValue={tx.description_raw} placeholder="Descrição" className={inputClass} />
                    <input name="amount" type="number" step="0.01" defaultValue={tx.amount} placeholder="Valor" className={inputClass + ' w-24'} />
                    <input name="occurredAt" type="date" defaultValue={tx.occurred_at.slice(0, 10)} className={inputClass} />
                  </InlineEdit>
                </td>
                <td className="px-4 py-3">
                  {tx.category ? <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs dark:bg-neutral-900">{tx.category.icon} {tx.category.name}</span> : <span className="text-xs text-neutral-400">sem categoria</span>}
                </td>
                <td className="px-4 py-3 text-xs text-neutral-500">{TYPE_LABELS[tx.type]}</td>
                <td className={`px-4 py-3 text-right font-medium ${Number(tx.amount) < 0 ? 'text-red-500' : 'text-emerald-600'}`}>{formatBRL(Number(tx.amount))}</td>
                <td className="px-4 py-3 text-right"><DeleteButton action={deleteTransactionAction} id={tx.id} confirmMessage="Excluir esta transação? O saldo da conta será ajustado." /></td>
              </tr>
            ))}
            {transactions.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-500">Nenhuma transação encontrada.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 className="mb-1 text-lg font-semibold">Minhas regras de categorização</h2>
        <p className="mb-4 text-xs text-neutral-500">Têm prioridade sobre a categorização automática padrão do sistema.</p>
        <div className="mb-4 space-y-2">
          {rules.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg bg-neutral-50 p-3 text-sm dark:bg-neutral-900">
              <span>Se descrição <strong>{r.match_type === 'contains' ? 'contém' : r.match_type === 'equals' ? 'é igual a' : r.match_type === 'starts_with' ? 'começa com' : 'combina com regex'}</strong> "{r.match_value}" → {r.category?.icon} {r.category?.name}</span>
              <DeleteButton action={deleteRuleAction} id={r.id} />
            </div>
          ))}
          {rules.length === 0 && <p className="text-sm text-neutral-400">Nenhuma regra personalizada ainda.</p>}
        </div>
        <form action={addRuleAction} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <select name="matchType" defaultValue="contains" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900">
            <option value="contains">Contém</option><option value="equals">É igual a</option>
            <option value="starts_with">Começa com</option><option value="regex">Regex</option>
          </select>
          <input name="matchValue" required placeholder='Padrão (ex: "UBER")' className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900" />
          <select name="categoryId" required className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900">
            <option value="">Categoria</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <button type="submit" className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600">Criar regra</button>
        </form>
      </div>
    </div>
  );
}
