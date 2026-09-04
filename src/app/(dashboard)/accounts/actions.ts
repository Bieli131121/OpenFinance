'use server';

import { revalidatePath } from 'next/cache';
import { createManualAccount, archiveAccount } from '@/lib/supabase/queries/accounts';
import { accountSchema, formatZodError } from '@/lib/validation/schemas';
import { logAudit } from '@/lib/security/audit';

export async function addManualAccountAction(formData: FormData) {
  const parsed = accountSchema.safeParse({
    name: String(formData.get('name') ?? ''), type: String(formData.get('type') ?? 'checking'),
    initialBalance: Number(formData.get('initialBalance') ?? 0),
  });
  if (!parsed.success) throw new Error(formatZodError(parsed.error));
  const account = await createManualAccount(parsed.data);
  await logAudit('account.create', 'accounts', account.id, { type: parsed.data.type });
  revalidatePath('/accounts');
  revalidatePath('/dashboard');
}

export async function deleteAccountAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('Conta inválida');
  await archiveAccount(id);
  await logAudit('account.archive', 'accounts', id);
  revalidatePath('/accounts');
  revalidatePath('/dashboard');
}
