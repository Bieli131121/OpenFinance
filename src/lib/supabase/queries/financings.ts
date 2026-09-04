import { createClient } from '@/lib/supabase/server';

export interface Financing {
  id: string; kind: string | null; financed_amount: number; outstanding_balance: number; interest_rate: number | null;
  term_months: number; installments_paid: number; installment_amount: number;
}

export async function getFinancings(): Promise<Financing[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('financings').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createFinancing(input: {
  kind: string; financedAmount: number; outstandingBalance: number; interestRate: number;
  termMonths: number; installmentsPaid: number; installmentAmount: number;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  const { error } = await supabase.from('financings').insert({
    user_id: user.id, kind: input.kind, financed_amount: input.financedAmount,
    outstanding_balance: input.outstandingBalance, interest_rate: input.interestRate,
    term_months: input.termMonths, installments_paid: input.installmentsPaid,
    installment_amount: input.installmentAmount,
  });
  if (error) throw error;
}

export async function updateFinancing(id: string, input: { outstandingBalance: number; installmentsPaid: number }) {
  const supabase = createClient();
  const { error } = await supabase.from('financings').update({
    outstanding_balance: input.outstandingBalance, installments_paid: input.installmentsPaid,
  }).eq('id', id);
  if (error) throw error;
}

export async function deleteFinancing(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('financings').delete().eq('id', id);
  if (error) throw error;
}
