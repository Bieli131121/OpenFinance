import { z } from 'zod';

export const updateTransactionSchema = z.object({
  description: z.string().trim().min(1, 'Descrição é obrigatória').max(200),
  amount: z.number().finite().refine((v) => v !== 0, 'Valor não pode ser zero'),
  occurredAt: z.string().min(1, 'Data é obrigatória'),
});

export const updateGoalSchema = z.object({
  currentAmount: z.number().min(0),
  targetAmount: z.number().positive('Valor objetivo deve ser maior que zero'),
  targetDate: z.string().nullable(),
});

export const updateLoanFinancingSchema = z.object({
  outstandingBalance: z.number().min(0),
  installmentsPaid: z.number().int().min(0),
});

export const updateInvestmentSchema = z.object({
  currentAmount: z.number().positive('Valor atual deve ser maior que zero'),
});
