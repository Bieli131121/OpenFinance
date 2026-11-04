import { z } from 'zod';
import { isValidDateOnly } from '@/lib/date';

const emptyToNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v);

export const saveBillSchema = z.object({
  description: z.string().trim().min(1, 'Descrição é obrigatória').max(200),
  beneficiary: z.preprocess(emptyToNull, z.string().trim().max(200).nullable()),
  amount: z.number().finite().positive('Valor deve ser maior que zero').max(100_000_000),
  dueDate: z.string().refine(isValidDateOnly, 'Vencimento inválido'),
  categoryId: z.preprocess(emptyToNull, z.string().uuid('Categoria inválida').nullable()),
  barcode: z.preprocess(emptyToNull, z.string().regex(/^\d{44}$/, 'Código de barras inválido').nullable()),
  digitableLine: z.preprocess(emptyToNull, z.string().regex(/^\d{47,48}$/, 'Linha digitável inválida').nullable()),
  source: z.enum(['manual', 'scan']),
  scanConfidence: z.preprocess(emptyToNull, z.number().min(0).max(1).nullable()),
});

export const payBillSchema = z.object({
  billId: z.string().uuid('Boleto inválido'),
  accountId: z.string().uuid('Escolha a conta de pagamento'),
});

export type SaveBillInput = z.infer<typeof saveBillSchema>;
