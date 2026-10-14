export interface AmortizationInput { outstandingBalance: number; monthlyInterestRate: number; remainingInstallments: number; currentInstallmentAmount: number; extraPayment: number; }
export interface AmortizationResult { reduceTerm: { newInstallments: number; monthsSaved: number; interestSaved: number }; reduceInstallment: { newInstallmentAmount: number; amountSaved: number; interestSaved: number }; }
function totalInterestPaid(installment: number, n: number, principal: number): number { return installment * n - principal; }
export function simulateExtraPayment(input: AmortizationInput): AmortizationResult {
  const { outstandingBalance, monthlyInterestRate: i, remainingInstallments: n, currentInstallmentAmount: pmt, extraPayment } = input;
  const newPrincipal = Math.max(outstandingBalance - extraPayment, 0);
  let newInstallments = 0;
  if (i > 0 && pmt > 0) { const ratio = 1 - (newPrincipal * i) / pmt; newInstallments = ratio > 0 ? Math.ceil(-Math.log(ratio) / Math.log(1 + i)) : 0; }
  else if (pmt > 0) { newInstallments = Math.ceil(newPrincipal / pmt); }
  const originalInterest = totalInterestPaid(pmt, n, outstandingBalance);
  const newInterestReduceTerm = totalInterestPaid(pmt, newInstallments, newPrincipal);
  let newInstallmentAmount = 0;
  if (i > 0) { newInstallmentAmount = (newPrincipal * i) / (1 - Math.pow(1 + i, -n)); } else { newInstallmentAmount = newPrincipal / n; }
  const newInterestReduceInstallment = totalInterestPaid(newInstallmentAmount, n, newPrincipal);
  return {
    reduceTerm: { newInstallments, monthsSaved: Math.max(n - newInstallments, 0), interestSaved: Math.max(originalInterest - newInterestReduceTerm, 0) },
    reduceInstallment: { newInstallmentAmount, amountSaved: Math.max(pmt - newInstallmentAmount, 0), interestSaved: Math.max(originalInterest - newInterestReduceInstallment, 0) },
  };
}
