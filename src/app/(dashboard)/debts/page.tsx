import { getLoans } from '@/lib/supabase/queries/loans';
import { addLoanAction, deleteLoanAction, updateLoanAction } from './actions';
import { DeleteButton } from '@/components/ui/delete-button';
import { InlineEdit } from '@/components/ui/inline-edit';

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
const inputClass = "rounded-lg border border-neutral-300 px-2 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-900";

export default async function DebtsPage() {
  const loans = await getLoans();
  const totalDebts = loans.reduce((s, l) => s + Number(l.outstanding_balance), 0);
  const monthlyInstallments = loans.reduce((s, l) => s + Number(l.installment_amount), 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dívidas e Empréstimos</h1>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800"><p className="text-xs text-neutral-500">Total de dívidas</p><p className="mt-1 text-xl font-semibold text-red-500">{formatBRL(totalDebts)}</p></div>
          <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800"><p className="text-xs text-neutral-500">Parcelas mensais</p><p className="mt-1 text-xl font-semibold">{formatBRL(monthlyInstallments)}</p></div>
        </div>
      </div>
      <div className="space-y-3">
        {loans.map((loan) => {
          const remaining = loan.installments_total - loan.installments_paid;
          return (
            <div key={loan.id} className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <p className="font-medium">{loan.creditor}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500">{loan.installments_paid}/{loan.installments_total} parcelas pagas</span>
                  <InlineEdit action={updateLoanAction} id={loan.id}>
                    <input name="outstandingBalance" type="number" step="0.01" defaultValue={loan.outstanding_balance} placeholder="Saldo devedor" className={inputClass} />
                    <input name="installmentsPaid" type="number" defaultValue={loan.installments_paid} placeholder="Parcelas pagas" className={inputClass} />
                  </InlineEdit>
                  <DeleteButton action={deleteLoanAction} id={loan.id} />
                </div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
                <div><p className="text-xs text-neutral-500">Saldo devedor</p><p className="font-medium">{formatBRL(Number(loan.outstanding_balance))}</p></div>
                <div><p className="text-xs text-neutral-500">Parcela</p><p className="font-medium">{formatBRL(Number(loan.installment_amount))}</p></div>
                <div><p className="text-xs text-neutral-500">Restam</p><p className="font-medium">{remaining} parcelas</p></div>
              </div>
            </div>
          );
        })}
        {loans.length === 0 && <div className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-neutral-500 dark:border-neutral-700">Nenhuma dívida cadastrada.</div>}
      </div>
      <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 className="mb-4 text-lg font-semibold">Nova dívida</h2>
        <form action={addLoanAction} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input name="creditor" required placeholder="Credor" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 sm:col-span-3" />
          <input name="originalAmount" type="number" step="0.01" placeholder="Valor original" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900" />
          <input name="outstandingBalance" type="number" step="0.01" required placeholder="Saldo devedor" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900" />
          <input name="interestRate" type="number" step="0.0001" placeholder="Taxa mensal (ex: 0.02)" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900" />
          <input name="installmentsTotal" type="number" placeholder="Nº total de parcelas" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900" />
          <input name="installmentsPaid" type="number" defaultValue={0} placeholder="Parcelas já pagas" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900" />
          <input name="installmentAmount" type="number" step="0.01" required placeholder="Valor da parcela" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900" />
          <button type="submit" className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 sm:col-span-3">Adicionar dívida</button>
        </form>
      </div>
    </div>
  );
}
