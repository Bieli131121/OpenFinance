'use server';

import { revalidatePath } from 'next/cache';
import { createGoal, updateGoal, deleteGoal } from '@/lib/supabase/queries/goals';
import { goalSchema, formatZodError } from '@/lib/validation/schemas';
import { updateGoalSchema } from '@/lib/validation/update-schemas';
import { logAudit } from '@/lib/security/audit';

export async function addGoalAction(formData: FormData) {
  const parsed = goalSchema.safeParse({
    name: String(formData.get('name') ?? ''), kind: String(formData.get('kind') ?? 'other'),
    targetAmount: Number(formData.get('targetAmount') ?? 0), currentAmount: Number(formData.get('currentAmount') ?? 0),
    targetDate: String(formData.get('targetDate') ?? '') || null,
  });
  if (!parsed.success) throw new Error(formatZodError(parsed.error));
  await createGoal(parsed.data);
  await logAudit('goal.create', 'financial_goals');
  revalidatePath('/goals');
}

export async function updateGoalAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const parsed = updateGoalSchema.safeParse({
    currentAmount: Number(formData.get('currentAmount') ?? 0),
    targetAmount: Number(formData.get('targetAmount') ?? 0),
    targetDate: String(formData.get('targetDate') ?? '') || null,
  });
  if (!id || !parsed.success) throw new Error(parsed.success ? 'Meta inválida' : formatZodError(parsed.error));
  await updateGoal(id, parsed.data);
  await logAudit('goal.update', 'financial_goals', id);
  revalidatePath('/goals');
}

export async function deleteGoalAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('Meta inválida');
  await deleteGoal(id);
  await logAudit('goal.delete', 'financial_goals', id);
  revalidatePath('/goals');
}
