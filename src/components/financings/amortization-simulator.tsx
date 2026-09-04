'use client';

import { useState } from 'react';
import { simulateExtraPayment } from '@/lib/amortization';

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function AmortizationSimulator({
  outstandingBalance, monthlyInterestRate, remainingInstallments, installmentAmount,
}: {
  outstandingBalance: number; monthlyInterestRate: number; remainingInstallments: number; installmentAmount: number;
}) {
  const [extraPayment, setExtraPayment] = useState(5000);

  const result = simulateExtraPayment({
    outstandingBalance, monthlyInterestRate, remainingInstallments,
    currentInstallmentAmount: installmentAmount, extraPayment,
  });

  return (
    <div className="mt-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <p className="mb-2 text-sm font-medium">Simular amortização extraordinária</p>
      <input
        type="number" value={extraPayment} onChange={(e) => setExtraPayment(Number(e.target.value))}
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
      />

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-900">
          <p className="text-xs font-medium text-neutral-500">REDUZIR PRAZO</p>
          <p className="mt-1 text-sm">Novo prazo: <strong>{result.reduceTerm.newInstallments} parcelas</strong></p>
          <p className="text-sm">Economia de tempo: <strong>{result.reduceTerm.monthsSaved} meses</strong></p>
          <p className="text-sm">Juros economizados: <strong>{formatBRL(result.reduceTerm.interestSaved)}</strong></p>
        </div>
        <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-900">
          <p className="text-xs font-medium text-neutral-500">REDUZIR PARCELA</p>
          <p className="mt-1 text-sm">Nova parcela: <strong>{formatBRL(result.reduceInstallment.newInstallmentAmount)}</strong></p>
          <p className="text-sm">Redução mensal: <strong>{formatBRL(result.reduceInstallment.amountSaved)}</strong></p>
          <p className="text-sm">Juros economizados: <strong>{formatBRL(result.reduceInstallment.interestSaved)}</strong></p>
        </div>
      </div>
    </div>
  );
}
