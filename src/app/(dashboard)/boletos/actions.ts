'use server';

import { revalidatePath } from 'next/cache';
import { createBill, deleteBill, payBill } from '@/lib/supabase/queries/bills';
import { payBillSchema, saveBillSchema } from '@/lib/validation/bill-schemas';
import { formatZodError } from '@/lib/validation/schemas';
import { logAudit } from '@/lib/security/audit';

export interface SaveBillState { ok: boolean; error?: string }

function revalidateAll() {
  for (const p of ['/boletos', '/dashboard', '/calendar', '/analytics', '/notifications']) revalidatePath(p);
}

/** Salva o boleto DEPOIS de o usuário ter conferido/editado os campos. */
export async function saveBillAction(_prev: SaveBillState, formData: FormData): Promise<SaveBillState> {
  const num = (k: string) => {
    const v = String(formData.get(k) ?? '').trim().replace(',', '.');
    return v === '' ? null : Number(v);
  };
  const parsed = saveBillSchema.safeParse({
    description: String(formData.get('description') ?? ''),
    beneficiary: String(formData.get('beneficiary') ?? ''),
    amount: num('amount') ?? NaN,
    dueDate: String(formData.get('dueDate') ?? ''),
    categoryId: String(formData.get('categoryId') ?? ''),
    barcode: String(formData.get('barcode') ?? ''),
    digitableLine: String(formData.get('digitableLine') ?? ''),
    source: String(formData.get('source') ?? 'manual'),
    scanConfidence: num('scanConfidence'),
  });
  if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

  try {
    const bill = await createBill(parsed.data);
    await logAudit('bill.create', 'payable_bills', bill.id, { source: parsed.data.source, amount: parsed.data.amount });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha ao salvar o boleto' };
  }
  revalidateAll();
  return { ok: true };
}

export async function payBillAction(formData: FormData) {
  const parsed = payBillSchema.safeParse({
    billId: String(formData.get('billId') ?? ''), accountId: String(formData.get('accountId') ?? ''),
  });
  if (!parsed.success) throw new Error(formatZodError(parsed.error));
  await payBill(parsed.data.billId, parsed.data.accountId);
  await logAudit('bill.pay', 'payable_bills', parsed.data.billId, { accountId: parsed.data.accountId });
  revalidateAll();
  revalidatePath('/accounts');
  revalidatePath('/transactions');
}

export async function deleteBillAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('Boleto inválido');
  await deleteBill(id);
  await logAudit('bill.delete', 'payable_bills', id);
  revalidateAll();
}
