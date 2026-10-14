import { getRecurringTransactions } from '@/lib/supabase/queries/recurring';
import { getCardsWithInvoices } from '@/lib/supabase/queries/cards';
function formatBRL(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
interface CalendarEvent { day: number; label: string; amount: number; kind: 'recurring' | 'invoice'; }
export default async function CalendarPage() {
  const [recurring, cards] = await Promise.all([getRecurringTransactions(), getCardsWithInvoices()]);
  const events: CalendarEvent[] = [];
  recurring.filter((r) => r.active && r.due_day).forEach((r) => { events.push({ day: r.due_day!, label: r.name, amount: Number(r.amount), kind: 'recurring' }); });
  cards.forEach((c) => { if (c.due_day) events.push({ day: c.due_day, label: `Fatura ${c.name}`, amount: Number(c.current_invoice?.total_amount ?? 0), kind: 'invoice' }); });
  events.sort((a, b) => a.day - b.day);
  const monthLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Calendário Financeiro</h1><p className="text-sm capitalize text-neutral-500">{monthLabel}</p></div>
      <div className="space-y-2">
        {events.map((e, idx) => (<div key={idx} className="flex items-center gap-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-neutral-100 font-semibold dark:bg-neutral-900">{e.day}</div><div className="flex-1"><p className="font-medium">{e.kind === 'invoice' ? '💳' : '🔄'} {e.label}</p></div><p className="font-medium">{formatBRL(e.amount)}</p></div>))}
        {events.length === 0 && <div className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-neutral-500 dark:border-neutral-700">Nenhum evento para este mês.</div>}
      </div>
    </div>
  );
}
