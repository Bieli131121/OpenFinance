import { getInvestments, CLASS_LABELS } from '@/lib/supabase/queries/investments';
import { addInvestmentAction, deleteInvestmentAction, updateInvestmentAction } from './actions';
import { DeleteButton } from '@/components/ui/delete-button';
import { InlineEdit } from '@/components/ui/inline-edit';

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
const inputClass = "rounded-lg border border-neutral-300 px-2 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-900";

export default async function InvestmentsPage() {
  const investments = await getInvestments();
  const total = investments.reduce((s, i) => s + Number(i.current_amount), 0);
  const byClass = investments.reduce<Record<string, number>>((acc, i) => {
    const key = i.class ?? 'other'; acc[key] = (acc[key] ?? 0) + Number(i.current_amount); return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div><p className="text-sm text-neutral-500">Total investido</p><h1 className="text-3xl font-bold">{formatBRL(total)}</h1></div>
      {Object.keys(byClass).length > 0 && (
        <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
          <h2 className="mb-3 text-sm font-medium text-neutral-500">Distribuição por classe</h2>
          <div className="space-y-2">
            {Object.entries(byClass).map(([cls, value]) => {
              const pct = total > 0 ? (value / total) * 100 : 0;
              return (
                <div key={cls}>
                  <div className="flex justify-between text-sm"><span>{CLASS_LABELS[cls] ?? cls}</span><span>{formatBRL(value)} ({pct.toFixed(0)}%)</span></div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-900"><div className="h-full bg-brand-500" style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {investments.map((inv) => {
          const gain = Number(inv.current_amount) - Number(inv.invested_amount);
          const gainPct = Number(inv.invested_amount) > 0 ? (gain / Number(inv.invested_amount)) * 100 : 0;
          return (
            <div key={inv.id} className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <p className="font-medium">{inv.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500">{CLASS_LABELS[inv.class ?? 'other']}</span>
                  <InlineEdit action={updateInvestmentAction} id={inv.id}>
                    <input name="currentAmount" type="number" step="0.01" defaultValue={inv.current_amount} placeholder="Valor atual" className={inputClass} />
                  </InlineEdit>
                  <DeleteButton action={deleteInvestmentAction} id={inv.id} />
                </div>
              </div>
              <p className="mt-2 text-lg font-semibold">{formatBRL(Number(inv.current_amount))}</p>
              <p className={`text-xs ${gain >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{gain >= 0 ? '+' : ''}{formatBRL(gain)} ({gainPct.toFixed(1)}%)</p>
            </div>
          );
        })}
        {investments.length === 0 && <div className="col-span-full rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-neutral-500 dark:border-neutral-700">Nenhum investimento cadastrado.</div>}
      </div>
      <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 className="mb-4 text-lg font-semibold">Novo investimento</h2>
        <form action={addInvestmentAction} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <input name="name" required placeholder="Nome (ex: Tesouro Selic 2029)" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 sm:col-span-2" />
          <select name="investmentClass" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900">
            {Object.entries(CLASS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <input name="investedAmount" type="number" step="0.01" placeholder="Valor investido" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900" />
          <input name="currentAmount" type="number" step="0.01" required placeholder="Valor atual" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 sm:col-span-4" />
          <button type="submit" className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 sm:col-span-4">Adicionar investimento</button>
        </form>
      </div>
    </div>
  );
}
