import { getAccountsWithBalances } from '@/lib/supabase/queries/accounts';
import { addManualAccountAction, deleteAccountAction } from './actions';
import { DeleteButton } from '@/components/ui/delete-button';
function formatBRL(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
const TYPE_LABELS: Record<string, string> = { checking: 'Conta corrente', savings: 'Poupança', salary: 'Conta salário', payment: 'Conta de pagamento', investment: 'Conta investimento', cash: 'Dinheiro físico', other: 'Outra' };
export default async function AccountsPage() {
  const accounts = await getAccountsWithBalances();
  const total = accounts.reduce((s, a) => s + Number(a.latest_balance), 0);
  return (
    <div className="space-y-8">
      <div><p className="text-sm text-neutral-500">Total em contas</p><h1 className="text-3xl font-bold">{formatBRL(total)}</h1></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((acc) => (<div key={acc.id} className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800"><div className="flex items-center justify-between"><p className="font-medium">{acc.name}</p><div className="flex items-center gap-2">{acc.is_manual && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500 dark:bg-neutral-900">manual</span>}<DeleteButton action={deleteAccountAction} id={acc.id} confirmMessage="Arquivar essa conta? O histórico de transações é preservado." /></div></div><p className="text-xs text-neutral-500">{TYPE_LABELS[acc.type]}</p><p className="mt-2 text-xl font-semibold">{formatBRL(Number(acc.latest_balance))}</p></div>))}
        {accounts.length === 0 && <div className="col-span-full rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-neutral-500 dark:border-neutral-700">Nenhuma conta cadastrada ainda.</div>}
      </div>
      <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 className="mb-4 text-lg font-semibold">Adicionar conta manual</h2>
        <form action={addManualAccountAction} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <input name="name" required placeholder="Nome da conta" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 sm:col-span-2" />
          <select name="type" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"><option value="checking">Conta corrente</option><option value="savings">Poupança</option><option value="salary">Conta salário</option><option value="cash">Dinheiro físico</option><option value="investment">Conta investimento</option><option value="other">Outra</option></select>
          <input name="initialBalance" type="number" step="0.01" defaultValue={0} placeholder="Saldo inicial" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900" />
          <button type="submit" className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 sm:col-span-4">Adicionar conta</button>
        </form>
      </div>
    </div>
  );
}
