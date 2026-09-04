import { getCurrentBudget, getExpenseCategories } from '@/lib/supabase/queries/budgets';
import { setBudgetLimitAction } from './actions';

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default async function BudgetsPage() {
  const [budget, categories] = await Promise.all([getCurrentBudget(), getExpenseCategories()]);
  const monthLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Orçamento</h1>
        <p className="text-sm capitalize text-neutral-500">{monthLabel}</p>
      </div>

      <div className="space-y-3">
        {budget.map((b) => {
          const pct = b.limitAmount > 0 ? (b.spentAmount / b.limitAmount) * 100 : 0;
          const status = pct >= 100 ? 'Orçamento ultrapassado' : pct >= 80 ? 'Atenção' : null;
          const barColor = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-brand-500';

          return (
            <div key={b.categoryId} className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <p className="font-medium">{b.icon} {b.categoryName}</p>
                <span className="text-xs text-neutral-500">
                  {formatBRL(b.spentAmount)} / {formatBRL(b.limitAmount)}
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-900">
                <div className={`h-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-neutral-500">Disponível: {formatBRL(Math.max(b.limitAmount - b.spentAmount, 0))}</span>
                {status && <span className={pct >= 100 ? 'text-red-500' : 'text-amber-600'}>{status}</span>}
              </div>
            </div>
          );
        })}
        {budget.length === 0 && (
          <div className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-neutral-500 dark:border-neutral-700">
            Nenhum limite definido para este mês ainda.
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 className="mb-4 text-lg font-semibold">Definir limite por categoria</h2>
        <form action={setBudgetLimitAction} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <select name="categoryId" required className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 sm:col-span-2">
            <option value="">Categoria</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <input name="limitAmount" type="number" step="0.01" required placeholder="Limite mensal" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900" />
          <button type="submit" className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 sm:col-span-3">
            Salvar limite
          </button>
        </form>
      </div>
    </div>
  );
}
