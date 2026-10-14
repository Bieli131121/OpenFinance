import { getGoals } from '@/lib/supabase/queries/goals';
import { addGoalAction, deleteGoalAction, updateGoalAction } from './actions';
import { DeleteButton } from '@/components/ui/delete-button';
import { InlineEdit } from '@/components/ui/inline-edit';
function formatBRL(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
const KIND_LABELS: Record<string, string> = { emergency_fund: 'Reserva de emergência', trip: 'Viagem', house: 'Casa', car: 'Carro', investment: 'Investimento', other: 'Outros' };
const ic = 'rounded-lg border border-neutral-300 px-2 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-900';
const f = 'rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900';
export default async function GoalsPage() {
  const goals = await getGoals();
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Minhas Metas</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {goals.map((g) => {
          const progress = g.target_amount > 0 ? Math.min((g.current_amount / g.target_amount) * 100, 100) : 0;
          const monthsLeft = g.target_date ? Math.max(1, Math.ceil((new Date(g.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30))) : null;
          const monthlyNeeded = monthsLeft ? Math.max((g.target_amount - g.current_amount) / monthsLeft, 0) : null;
          return (
            <div key={g.id} className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
              <div className="flex items-center justify-between"><p className="font-medium">{g.name}</p><div className="flex items-center gap-2"><span className="text-xs text-neutral-500">{KIND_LABELS[g.kind ?? 'other']}</span><InlineEdit action={updateGoalAction} id={g.id}><input name="currentAmount" type="number" step="0.01" defaultValue={g.current_amount} placeholder="Valor atual" className={ic} /><input name="targetAmount" type="number" step="0.01" defaultValue={g.target_amount} placeholder="Objetivo" className={ic} /><input name="targetDate" type="date" defaultValue={g.target_date?.slice(0, 10) ?? ''} className={ic} /></InlineEdit><DeleteButton action={deleteGoalAction} id={g.id} /></div></div>
              <p className="mt-2 text-sm text-neutral-500">{formatBRL(Number(g.current_amount))} de {formatBRL(Number(g.target_amount))}</p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-900"><div className="h-full bg-brand-500" style={{ width: `${progress}%` }} /></div>
              <p className="mt-1 text-xs text-neutral-500">{progress.toFixed(0)}% concluído</p>
              {monthlyNeeded !== null && <p className="mt-2 text-xs text-neutral-500">Guarde ~{formatBRL(monthlyNeeded)}/mês para atingir até {new Date(g.target_date!).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>}
            </div>
          );
        })}
        {goals.length === 0 && <div className="col-span-full rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-neutral-500 dark:border-neutral-700">Nenhuma meta cadastrada ainda.</div>}
      </div>
      <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 className="mb-4 text-lg font-semibold">Nova meta</h2>
        <form action={addGoalAction} className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          <input name="name" required placeholder="Nome da meta" className={f + ' sm:col-span-2'} />
          <select name="kind" className={f}><option value="emergency_fund">Reserva de emergência</option><option value="trip">Viagem</option><option value="house">Casa</option><option value="car">Carro</option><option value="investment">Investimento</option><option value="other">Outros</option></select>
          <input name="targetAmount" type="number" step="0.01" required placeholder="Valor objetivo" className={f} />
          <input name="currentAmount" type="number" step="0.01" defaultValue={0} placeholder="Valor atual" className={f} />
          <input name="targetDate" type="date" className={f} />
          <button type="submit" className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 sm:col-span-5">Criar meta</button>
        </form>
      </div>
    </div>
  );
}
