'use server';
import { revalidatePath } from 'next/cache';
import { createTransaction, updateTransaction, deleteTransaction } from '@/lib/supabase/queries/transactions';
import { createFinancialRule, deleteFinancialRule } from '@/lib/supabase/queries/rules';
import { transactionSchema, formatZodError } from '@/lib/validation/schemas';
import { updateTransactionSchema } from '@/lib/validation/update-schemas';
import { logAudit } from '@/lib/security/audit';
import type { TransactionType } from '@/types/database';
import { z } from 'zod';
export async function addTransactionAction(formData: FormData) {
  const type = String(formData.get('type') ?? 'expense') as TransactionType;
  const rawAmount = Number(formData.get('amount') ?? 0);
  const amount = type === 'expense' ? -Math.abs(rawAmount) : Math.abs(rawAmount);
  const parsed = transactionSchema.safeParse({ accountId: String(formData.get('accountId') ?? ''), description: String(formData.get('description') ?? ''), amount, type, occurredAt: String(formData.get('occurredAt') ?? '') });
  if (!parsed.success) throw new Error(formatZodError(parsed.error));
  const tx = await createTransaction({ accountId: parsed.data.accountId, description: parsed.data.description, amount: parsed.data.amount, type: parsed.data.type, occurredAt: new Date(parsed.data.occurredAt).toISOString() });
  await logAudit('transaction.create', 'transactions', tx.id, { amount: parsed.data.amount, type: parsed.data.type });
  revalidatePath('/transactions'); revalidatePath('/dashboard'); revalidatePath('/accounts');
}
export async function updateTransactionAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const parsed = updateTransactionSchema.safeParse({ description: String(formData.get('description') ?? ''), amount: Number(formData.get('amount') ?? 0), occurredAt: String(formData.get('occurredAt') ?? '') });
  if (!id || !parsed.success) throw new Error(parsed.success ? 'Transação inválida' : formatZodError(parsed.error));
  await updateTransaction(id, { ...parsed.data, occurredAt: new Date(parsed.data.occurredAt).toISOString() });
  await logAudit('transaction.update', 'transactions', id);
  revalidatePath('/transactions'); revalidatePath('/dashboard'); revalidatePath('/accounts');
}
export async function deleteTransactionAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('Transação inválida');
  await deleteTransaction(id);
  await logAudit('transaction.delete', 'transactions', id);
  revalidatePath('/transactions'); revalidatePath('/dashboard'); revalidatePath('/accounts');
}
const ruleSchema = z.object({ matchType: z.enum(['contains', 'equals', 'starts_with', 'regex']), matchValue: z.string().trim().min(1, 'Padrão de busca é obrigatório').max(100), categoryId: z.string().uuid('Categoria inválida') });
export async function addRuleAction(formData: FormData) {
  const parsed = ruleSchema.safeParse({ matchType: String(formData.get('matchType') ?? 'contains'), matchValue: String(formData.get('matchValue') ?? ''), categoryId: String(formData.get('categoryId') ?? '') });
  if (!parsed.success) throw new Error(formatZodError(parsed.error));
  await createFinancialRule(parsed.data);
  await logAudit('rule.create', 'financial_rules');
  revalidatePath('/transactions');
}
export async function deleteRuleAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('Regra inválida');
  await deleteFinancialRule(id);
  await logAudit('rule.delete', 'financial_rules', id);
  revalidatePath('/transactions');
}
