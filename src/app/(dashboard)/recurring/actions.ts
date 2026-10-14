'use server';
import { revalidatePath } from 'next/cache';
import { createRecurring, toggleRecurring, deleteRecurring } from '@/lib/supabase/queries/recurring';
import { recurringSchema, formatZodError } from '@/lib/validation/schemas';
import { logAudit } from '@/lib/security/audit';
export async function addRecurringAction(formData: FormData) {
  const parsed = recurringSchema.safeParse({ name: String(formData.get('name') ?? ''), amount: Number(formData.get('amount') ?? 0), categoryId: String(formData.get('categoryId') ?? '') || null, frequency: String(formData.get('frequency') ?? 'monthly'), dueDay: Number(formData.get('dueDay') ?? 1), accountId: String(formData.get('accountId') ?? '') || null });
  if (!parsed.success) throw new Error(formatZodError(parsed.error));
  await createRecurring(parsed.data);
  await logAudit('recurring.create', 'recurring_transactions');
  revalidatePath('/recurring'); revalidatePath('/analytics');
}
export async function toggleRecurringAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const active = formData.get('active') === 'true';
  await toggleRecurring(id, active);
  await logAudit('recurring.toggle', 'recurring_transactions', id, { active });
  revalidatePath('/recurring'); revalidatePath('/analytics');
}
export async function deleteRecurringAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('Recorrência inválida');
  await deleteRecurring(id);
  await logAudit('recurring.delete', 'recurring_transactions', id);
  revalidatePath('/recurring'); revalidatePath('/analytics');
}
