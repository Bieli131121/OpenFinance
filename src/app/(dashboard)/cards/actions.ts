'use server';
import { revalidatePath } from 'next/cache';
import { createManualCard, archiveCard, payInvoice } from '@/lib/supabase/queries/cards';
import { createCardPurchase } from '@/lib/supabase/queries/installments';
import { recalculateCardInvoices } from '@/lib/supabase/queries/invoice-recalc';
import { cardSchema, formatZodError } from '@/lib/validation/schemas';
import { cardPurchaseSchema } from '@/lib/validation/card-purchase-schema';
import { logAudit } from '@/lib/security/audit';
export async function addManualCardAction(formData: FormData) {
  const parsed = cardSchema.safeParse({ name: String(formData.get('name') ?? ''), brand: String(formData.get('brand') ?? '') || undefined, lastFour: String(formData.get('lastFour') ?? '') || undefined, creditLimit: Number(formData.get('creditLimit') ?? 0), closingDay: Number(formData.get('closingDay') ?? 1), dueDay: Number(formData.get('dueDay') ?? 10) });
  if (!parsed.success) throw new Error(formatZodError(parsed.error));
  const card = await createManualCard(parsed.data);
  await logAudit('card.create', 'cards', card.id);
  revalidatePath('/cards'); revalidatePath('/dashboard');
}
export async function deleteCardAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('Cartão inválido');
  await archiveCard(id);
  await logAudit('card.archive', 'cards', id);
  revalidatePath('/cards'); revalidatePath('/dashboard');
}
export async function addCardPurchaseAction(formData: FormData) {
  const parsed = cardPurchaseSchema.safeParse({ cardId: String(formData.get('cardId') ?? ''), description: String(formData.get('description') ?? ''), totalAmount: Number(formData.get('totalAmount') ?? 0), installments: Number(formData.get('installments') ?? 1), purchaseDate: String(formData.get('purchaseDate') ?? '') });
  if (!parsed.success) throw new Error(formatZodError(parsed.error));
  const { groupId } = await createCardPurchase({ cardId: parsed.data.cardId, description: parsed.data.description, totalAmount: parsed.data.totalAmount, installments: parsed.data.installments, purchaseDate: new Date(parsed.data.purchaseDate).toISOString() });
  await logAudit('card_purchase.create', 'transactions', groupId, { installments: parsed.data.installments, totalAmount: parsed.data.totalAmount });
  revalidatePath('/cards'); revalidatePath('/dashboard'); revalidatePath('/analytics');
}
export async function recalculateInvoiceAction(formData: FormData) {
  const cardId = String(formData.get('cardId') ?? '');
  if (!cardId) throw new Error('Cartão inválido');
  await recalculateCardInvoices(cardId);
  revalidatePath('/cards'); revalidatePath('/dashboard');
}
export async function payInvoiceAction(formData: FormData) {
  const invoiceId = String(formData.get('invoiceId') ?? '');
  const accountId = String(formData.get('accountId') ?? '');
  if (!invoiceId || !accountId) throw new Error('Fatura e conta de pagamento são obrigatórias');
  await payInvoice(invoiceId, accountId);
  await logAudit('invoice.pay', 'credit_card_invoices', invoiceId, { accountId });
  revalidatePath('/cards'); revalidatePath('/dashboard'); revalidatePath('/accounts');
}
