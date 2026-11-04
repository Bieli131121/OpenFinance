'use server';

import { revalidatePath } from 'next/cache';
import { setBudgetCategoryLimit } from '@/lib/supabase/queries/budgets';
import { budgetLimitSchema, formatZodError } from '@/lib/validation/schemas';
import { logAudit } from '@/lib/security/audit';

export async function setBudgetLimitAction(formData: FormData) {
  const parsed = budgetLimitSchema.safeParse({
    categoryId: String(formData.get('categoryId') ?? ''),
    limitAmount: Number(formData.get('limitAmount') ?? 0),
  });
  if (!parsed.success) throw new Error(formatZodError(parsed.error));

  await setBudgetCategoryLimit(parsed.data.categoryId, parsed.data.limitAmount);
  await logAudit('budget.set_limit', 'budget_categories', parsed.data.categoryId);
  revalidatePath('/budgets');
}
