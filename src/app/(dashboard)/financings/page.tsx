import { getFinancings } from '@/lib/supabase/queries/financings';
import { addFinancingAction, deleteFinancingAction, updateFinancingAction } from './actions';
import { AmortizationSimulator } from '@/components/financings/amortization-simulator';
import { DeleteButton } from '@/components/ui/delete-button';
import { InlineEdit } from '@/components/ui/inline-edit';
function formatBRL(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
const KIND_LABELS: Record<string, string> = { real_estate: 'Imobiliário', vehicle: 'Veículo', other: 'Outro' };
const ic = 'rounded-lg border border-neutral-300 px-2 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-900';
const f = 'rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900';
export default async function FinancingsPage() {
  const financings = await getFinancings();
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Financiamentos</h1>
      <div className="space-y-4">
        {financings.map((fin) => { const remaining = fin.term_months - fin.installments_paid; return (
          <div key={fin.id} className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
            <div className="flex items-center justify-between"><p className="font-medium">{KIND_LABELS[fin.kind ?? 'other']}</p><div className="flex items-center gap-2"><span className="text-xs text-neutral-500">{fin.installments_paid}/{fin.term_months} parcelas pagas</span><InlineEdit action={updateFinancingAction} id={fin.id}><input name="outstandingBalance" type="number" step="0.01" defaultValue={fin.outstanding_balance} placeholder="Saldo devedor" className={ic} /><input name="installmentsPaid" type="number" defaultValue={fin.installments_paid} placeholder="Parcelas pagas" className={ic} /></InlineEdit><DeleteButton action={deleteFinancingAction} id={fin.id} /></div></div>
            <div className="mt-2 grid grid-cols-3 gap-3 text-sm"><div><p className="text-xs text-neutral-500">Saldo devedor</p><p className="font-medium">{formatBRL(Number(fin.outstanding_balance))}</p></div><div><p className="text-xs text-neutral-500">Parcela</p><p className="font-medium">{formatBRL(Number(fin.installment_amount))}</p></div><div><p className="text-xs text-neutral-500">Restam</p><p className="font-medium">{remaining} parcelas</p></div></div>
            <AmortizationSimulator outstandingBalance={Number(fin.outstanding_balance)} monthlyInterestRate={Number(fin.interest_rate ?? 0)} remainingInstallments={remaining} installmentAmount={Number(fin.installment_amount)} />
          </div>); })}
        {financings.length === 0 && <div className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-neutral-500 dark:border-neutral-700">Nenhum financiamento cadastrado.</div>}
      </div>
      <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 className="mb-4 text-lg font-semibold">Novo financiamento</h2>
        <form action={addFinancingAction} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <select name="kind" className={f}><option value="real_estate">Imobiliário</option><option value="vehicle">Veículo</option><option value="other">Outro</option></select>
          <input name="financedAmount" type="number" step="0.01" placeholder="Valor financiado" className={f} />
          <input name="outstandingBalance" type="number" step="0.01" required placeholder="Saldo devedor" className={f} />
          <input name="interestRate" type="number" step="0.0001" placeholder="Taxa mensal (ex: 0.008)" className={f} />
          <input name="termMonths" type="number" required placeholder="Prazo total (meses)" className={f} />
          <input name="installmentsPaid" type="number" defaultValue={0} placeholder="Parcelas já pagas" className={f} />
          <input name="installmentAmount" type="number" step="0.01" required placeholder="Valor da parcela" className={f} />
          <button type="submit" className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 sm:col-span-3">Adicionar financiamento</button>
        </form>
      </div>
    </div>
  );
}
