'use server';
import { revalidatePath } from 'next/cache';
import { createInvestment, updateInvestment, deleteInvestment } from '@/lib/supabase/queries/investments';
import { investmentSchema, formatZodError } from '@/lib/validation/schemas';
import { updateInvestmentSchema } from '@/lib/validation/update-schemas';
import { logAudit } from '@/lib/security/audit';
export async function addInvestmentAction(formData: FormData) {
  const parsed = investmentSchema.safeParse({ name: String(formData.get('name') ?? ''), investmentClass: String(formData.get('investmentClass') ?? 'other'), investedAmount: Number(formData.get('investedAmount') ?? 0), currentAmount: Number(formData.get('currentAmount') ?? 0) });
  if (!parsed.success) throw new Error(formatZodError(parsed.error));
  await createInvestment(parsed.data);
  await logAudit('investment.create', 'investments');
  revalidatePath('/investments'); revalidatePath('/dashboard'); revalidatePath('/net-worth');
}
export async function updateInvestmentAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const parsed = updateInvestmentSchema.safeParse({ currentAmount: Number(formData.get('currentAmount') ?? 0) });
  if (!id || !parsed.success) throw new Error(parsed.success ? 'Investimento inválido' : formatZodError(parsed.error));
  await updateInvestment(id, parsed.data);
  await logAudit('investment.update', 'investments', id);
  revalidatePath('/investments'); revalidatePath('/dashboard'); revalidatePath('/net-worth');
}
export async function deleteInvestmentAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('Investimento inválido');
  await deleteInvestment(id);
  await logAudit('investment.delete', 'investments', id);
  revalidatePath('/investments'); revalidatePath('/dashboard'); revalidatePath('/net-worth');
}
