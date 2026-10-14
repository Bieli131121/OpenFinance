'use server';
import { revalidatePath } from 'next/cache';
import { createAsset, createLiability, deleteAsset, deleteLiability } from '@/lib/supabase/queries/net-worth';
import { assetLiabilitySchema, formatZodError } from '@/lib/validation/schemas';
import { logAudit } from '@/lib/security/audit';
export async function addAssetAction(formData: FormData) {
  const parsed = assetLiabilitySchema.safeParse({ name: String(formData.get('name') ?? ''), kind: String(formData.get('kind') ?? 'other'), value: Number(formData.get('value') ?? 0) });
  if (!parsed.success) throw new Error(formatZodError(parsed.error));
  await createAsset(parsed.data); await logAudit('asset.create', 'assets');
  revalidatePath('/net-worth'); revalidatePath('/dashboard');
}
export async function addLiabilityAction(formData: FormData) {
  const parsed = assetLiabilitySchema.safeParse({ name: String(formData.get('name') ?? ''), kind: String(formData.get('kind') ?? 'other'), value: Number(formData.get('value') ?? 0) });
  if (!parsed.success) throw new Error(formatZodError(parsed.error));
  await createLiability(parsed.data); await logAudit('liability.create', 'liabilities');
  revalidatePath('/net-worth'); revalidatePath('/dashboard');
}
export async function deleteAssetAction(formData: FormData) {
  const id = String(formData.get('id') ?? ''); if (!id) throw new Error('Ativo inválido');
  await deleteAsset(id); await logAudit('asset.delete', 'assets', id);
  revalidatePath('/net-worth'); revalidatePath('/dashboard');
}
export async function deleteLiabilityAction(formData: FormData) {
  const id = String(formData.get('id') ?? ''); if (!id) throw new Error('Passivo inválido');
  await deleteLiability(id); await logAudit('liability.delete', 'liabilities', id);
  revalidatePath('/net-worth'); revalidatePath('/dashboard');
}
