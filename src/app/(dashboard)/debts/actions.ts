'use server';

import { revalidatePath } from 'next/cache';
import { createLoan, updateLoan, deleteLoan } from '@/lib/supabase/queries/loans';
import { loanSchema, formatZodError } from '@/lib/validation/schemas';
import { updateLoanFinancingSchema } from '@/lib/validation/update-schemas';
import { logAudit } from '@/lib/security/audit';

export async function addLoanAction(formData: FormData) {
  const parsed = loanSchema.safeParse({
    creditor: String(formData.get('creditor') ?? ''), originalAmount: Number(formData.get('originalAmount') ?? 0),
    outstandingBalance: Number(formData.get('outstandingBalance') ?? 0), interestRate: Number(formData.get('interestRate') ?? 0),
    installmentsTotal: Number(formData.get('installmentsTotal') ?? 0), installmentsPaid: Number(formData.get('installmentsPaid') ?? 0),
    installmentAmount: Number(formData.get('installmentAmount') ?? 0),
  });
  if (!parsed.success) throw new Error(formatZodError(parsed.error));
  await createLoan(parsed.data);
  await logAudit('loan.create', 'loans');
  revalidatePath('/debts');
  revalidatePath('/dashboard');
}

export async function updateLoanAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const parsed = updateLoanFinancingSchema.safeParse({
    outstandingBalance: Number(formData.get('outstandingBalance') ?? 0),
    installmentsPaid: Number(formData.get('installmentsPaid') ?? 0),
  });
  if (!id || !parsed.success) throw new Error(parsed.success ? 'Dívida inválida' : formatZodError(parsed.error));
  await updateLoan(id, parsed.data);
  await logAudit('loan.update', 'loans', id);
  revalidatePath('/debts');
  revalidatePath('/dashboard');
}

export async function deleteLoanAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('Dívida inválida');
  await deleteLoan(id);
  await logAudit('loan.delete', 'loans', id);
  revalidatePath('/debts');
  revalidatePath('/dashboard');
}
