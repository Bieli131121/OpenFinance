import { z } from 'zod';
import { isValidDateOnly } from '@/lib/date';

export const cardPurchaseSchema = z.object({
  cardId: z.string().uuid('Cartão inválido'),
  description: z.string().trim().min(1, 'Descrição é obrigatória').max(200),
  totalAmount: z.number().positive('Valor deve ser maior que zero'),
  installments: z.number().int().min(1, 'No mínimo 1 parcela').max(48, 'Máximo de 48 parcelas'),
  purchaseDate: z.string().refine(isValidDateOnly, 'Data inválida'),
});
