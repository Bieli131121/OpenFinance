'use server';
import { revalidatePath } from 'next/cache';
import { createFinancing, updateFinancing, deleteFinancing } from '@/lib/supabase/queries/financings';
import { financingSchema, formatZodError } from '@/lib/validation/schemas';
import { updateLoanFinancingSchema } from '@/lib/validation/update-schemas';
import { logAudit } from '@/lib/security/audit';
export async function addFinancingAction(formData: FormData) {
  const parsed = financingSchema.safeParse({ kind: String(formData.get('kind') ?? 'other'), financedAmount: Number(formData.get('financedAmount') ?? 0), outstandingBalance: Number(formData.get('outstandingBalance') ?? 0), interestRate: Number(formData.get('interestRate') ?? 0), termMonths: Number(formData.get('termMonths') ?? 0), installmentsPaid: Number(formData.get('installmentsPaid') ?? 0), installmentAmount: Number(formData.get('installmentAmount') ?? 0) });
  if (!parsed.success) throw new Error(formatZodError(parsed.error));
  await createFinancing(parsed.data);
  await logAudit('financing.create', 'financings');
  revalidatePath('/financings'); revalidatePath('/dashboard');
}
export async function updateFinancingAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const parsed = updateLoanFinancingSchema.safeParse({ outstandingBalance: Number(formData.get('outstandingBalance') ?? 0), installmentsPaid: Number(formData.get('installmentsPaid') ?? 0) });
  if (!id || !parsed.success) throw new Error(parsed.success ? 'Financiamento inválido' : formatZodError(parsed.error));
  await updateFinancing(id, parsed.data);
  await logAudit('financing.update', 'financings', id);
  revalidatePath('/financings'); revalidatePath('/dashboard');
}
export async function deleteFinancingAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('Financiamento inválido');
  await deleteFinancing(id);
  await logAudit('financing.delete', 'financings', id);
  revalidatePath('/financings'); revalidatePath('/dashboard');
}
