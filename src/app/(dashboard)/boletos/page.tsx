import { getPendingBills, getRecentPaidBills } from '@/lib/supabase/queries/bills';
import { getAccountsWithBalances } from '@/lib/supabase/queries/accounts';
import { createClient } from '@/lib/supabase/server';
import { daysBetween, formatDateOnly, todayISODate } from '@/lib/date';
import { formatBRL } from '@/lib/money';
import { BoletoScanner } from '@/components/boletos/boleto-scanner';
import { CopyButton } from '@/components/boletos/copy-button';
import { DeleteButton } from '@/components/ui/delete-button';
import { deleteBillAction, payBillAction } from './actions';

function dueBadge(dueDate: string, today: string) {
  const diff = daysBetween(today, dueDate);
  if (diff < 0) return { text: `Vencido há ${-diff} dia${diff === -1 ? '' : 's'}`, cls: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' };
  if (diff === 0) return { text: 'Vence hoje', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200' };
  if (diff <= 3) return { text: `Vence em ${diff} dia${diff === 1 ? '' : 's'}`, cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200' };
  return { text: `Em ${diff} dias`, cls: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400' };
}

export default async function BoletosPage() {
  const supabase = createClient();
  const [pending, paid, accounts, { data: categories }] = await Promise.all([
    getPendingBills(),
    getRecentPaidBills(8),
    getAccountsWithBalances(),
    supabase.from('transaction_categories').select('id, name, icon').eq('kind', 'expense').order('name'),
  ]);

  const today = todayISODate();
  const total = pending.reduce((s, b) => s + Number(b.amount), 0);
  const overdue = pending.filter((b) => b.due_date < today);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Boletos</h1>
        <p className="text-sm text-neutral-500">
          {pending.length} a pagar · {formatBRL(total)}
          {overdue.length > 0 && <span className="text-red-500"> · {overdue.length} vencido{overdue.length > 1 ? 's' : ''}</span>}
        </p>
      </div>

      <BoletoScanner categories={categories ?? []} />

      <div className="space-y-2">
        {pending.map((b) => {
          const badge = dueBadge(b.due_date, today);
          return (
            <div key={b.id} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{b.description}</p>
                  <p className="text-xs text-neutral-500">
                    {b.category ? `${b.category.icon ?? ''} ${b.category.name}` : 'Sem categoria'}
                    {b.beneficiary && b.beneficiary !== b.description ? ` · ${b.beneficiary}` : ''}
                    {b.source === 'scan' ? ' · lido por foto' : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">{formatBRL(Number(b.amount))}</p>
                  <p className="text-xs text-neutral-500">{formatDateOnly(b.due_date)}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className={`rounded-full px-2 py-0.5 text-xs ${badge.cls}`}>{badge.text}</span>
                {b.digitable_line && <CopyButton text={b.digitable_line} />}
                <form action={payBillAction} className="ml-auto flex items-center gap-2">
                  <input type="hidden" name="billId" value={b.id} />
                  <select name="accountId" required defaultValue="" aria-label="Conta de pagamento" className="rounded-lg border border-neutral-300 px-2 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-900">
                    <option value="" disabled>Pagar com…</option>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({formatBRL(Number(a.latest_balance))})</option>)}
                  </select>
                  <button type="submit" className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600">Marcar como pago</button>
                </form>
                <DeleteButton action={deleteBillAction} id={b.id} confirmMessage="Excluir este boleto da lista?" />
              </div>
            </div>
          );
        })}
        {pending.length === 0 && (
          <div className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-neutral-500 dark:border-neutral-700">
            Nenhum boleto pendente. Tire uma foto de um boleto para começar.
          </div>
        )}
      </div>

      {paid.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-neutral-500">Pagos recentemente</h2>
          <div className="space-y-1">
            {paid.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-lg border border-neutral-100 px-4 py-2 text-sm opacity-70 dark:border-neutral-900">
                <span>✓ {b.description}</span>
                <span>{formatBRL(Number(b.amount))}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
