import { createClient } from '@/lib/supabase/server';

export interface Loan {
  id: string; creditor: string; original_amount: number; outstanding_balance: number; interest_rate: number | null;
  installments_total: number; installments_paid: number; installment_amount: number;
}

export async function getLoans(): Promise<Loan[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('loans').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getTotalDebts(): Promise<number> {
  const loans = await getLoans();
  return loans.reduce((s, l) => s + Number(l.outstanding_balance), 0);
}

export async function createLoan(input: {
  creditor: string; originalAmount: number; outstandingBalance: number; interestRate: number;
  installmentsTotal: number; installmentsPaid: number; installmentAmount: number;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  const { error } = await supabase.from('loans').insert({
    user_id: user.id, creditor: input.creditor, original_amount: input.originalAmount,
    outstanding_balance: input.outstandingBalance, interest_rate: input.interestRate,
    installments_total: input.installmentsTotal, installments_paid: input.installmentsPaid,
    installment_amount: input.installmentAmount,
  });
  if (error) throw error;
}

/** Edição mais comum: registrar que mais parcelas foram pagas e atualizar o saldo devedor. */
export async function updateLoan(id: string, input: { outstandingBalance: number; installmentsPaid: number }) {
  const supabase = createClient();
  const { error } = await supabase.from('loans').update({
    outstanding_balance: input.outstandingBalance, installments_paid: input.installmentsPaid,
  }).eq('id', id);
  if (error) throw error;
}

export async function deleteLoan(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('loans').delete().eq('id', id);
  if (error) throw error;
}
