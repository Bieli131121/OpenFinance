import { getRecurringTransactions } from '@/lib/supabase/queries/recurring';
import { getAccountsWithBalances } from '@/lib/supabase/queries/accounts';
import { getExpenseCategories } from '@/lib/supabase/queries/budgets';
import { addRecurringAction, toggleRecurringAction, deleteRecurringAction } from './actions';
import { DeleteButton } from '@/components/ui/delete-button';
function formatBRL(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
const FREQ_LABELS: Record<string, string> = { weekly: 'Semanal', monthly: 'Mensal', yearly: 'Anual', custom: 'Personalizado' };
const f = 'rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900';
export default async function RecurringPage() {
  const [items, accounts, categories] = await Promise.all([getRecurringTransactions(), getAccountsWithBalances(), getExpenseCategories()]);
  const activeTotal = items.filter((i) => i.active).reduce((s, i) => s + Number(i.amount), 0);
  return (
    <div className="space-y-8">
      <div><h1 className="text-2xl font-bold">Contas Recorrentes</h1><p className="text-sm text-neutral-500">Total mensal ativo: <strong>{formatBRL(activeTotal)}</strong></p></div>
      <div className="space-y-2">
        {items.map((item) => (<div key={item.id} className="flex items-center justify-between rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"><div><p className="font-medium">{item.category?.icon} {item.name}</p><p className="text-xs text-neutral-500">{FREQ_LABELS[item.frequency]} — dia {item.due_day} — {formatBRL(Number(item.amount))}</p></div><div className="flex items-center gap-2"><form action={toggleRecurringAction}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="active" value={(!item.active).toString()} /><button type="submit" className={`rounded-full px-3 py-1 text-xs font-medium ${item.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-900'}`}>{item.active ? 'Ativa' : 'Inativa'}</button></form><DeleteButton action={deleteRecurringAction} id={item.id} /></div></div>))}
        {items.length === 0 && <div className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-neutral-500 dark:border-neutral-700">Nenhuma conta recorrente cadastrada.</div>}
      </div>
      <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 className="mb-4 text-lg font-semibold">Nova conta recorrente</h2>
        <form action={addRecurringAction} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input name="name" required placeholder="Nome (ex: Aluguel, Netflix)" className={f} />
          <input name="amount" type="number" step="0.01" required placeholder="Valor" className={f} />
          <select name="frequency" className={f}><option value="monthly">Mensal</option><option value="weekly">Semanal</option><option value="yearly">Anual</option><option value="custom">Personalizado</option></select>
          <select name="categoryId" className={f}><option value="">Categoria (opcional)</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select>
          <input name="dueDay" type="number" min={1} max={31} required placeholder="Dia de vencimento" className={f} />
          <select name="accountId" className={f}><option value="">Conta de pagamento (opcional)</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          <button type="submit" className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 sm:col-span-3">Adicionar</button>
        </form>
      </div>
    </div>
  );
}
