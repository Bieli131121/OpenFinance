import { z } from 'zod';

// Schemas de validação para os formulários que envolvem dinheiro ou dados
// sensíveis. Rodados no server (dentro das Server Actions) antes de qualquer
// escrita no banco -- nunca confiar só na validação do HTML no client.

export const transactionSchema = z.object({
  accountId: z.string().uuid('Conta inválida'),
  description: z.string().trim().min(1, 'Descrição é obrigatória').max(200),
  amount: z.number().finite().refine((v) => v !== 0, 'Valor não pode ser zero'),
  type: z.enum(['income', 'expense', 'transfer', 'investment', 'redemption', 'card_payment', 'adjustment']),
  occurredAt: z.string().min(1, 'Data é obrigatória'),
});

export const accountSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(100),
  type: z.enum(['checking', 'savings', 'salary', 'payment', 'investment', 'cash', 'other']),
  initialBalance: z.number().finite(),
});

export const cardSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(100),
  brand: z.string().trim().max(50).optional(),
  lastFour: z.string().trim().regex(/^\d{0,4}$/, 'Deve conter só números').max(4).optional(),
  creditLimit: z.number().positive('Limite deve ser maior que zero'),
  closingDay: z.number().int().min(1).max(31),
  dueDay: z.number().int().min(1).max(31),
});

export const goalSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(100),
  kind: z.string(),
  targetAmount: z.number().positive('Valor objetivo deve ser maior que zero'),
  currentAmount: z.number().min(0),
  targetDate: z.string().nullable(),
});

export const loanSchema = z.object({
  creditor: z.string().trim().min(1, 'Credor é obrigatório').max(100),
  originalAmount: z.number().min(0),
  outstandingBalance: z.number().positive('Saldo devedor deve ser maior que zero'),
  interestRate: z.number().min(0).max(1, 'Taxa parece muito alta -- use formato decimal, ex: 0.02 para 2%'),
  installmentsTotal: z.number().int().min(0),
  installmentsPaid: z.number().int().min(0),
  installmentAmount: z.number().positive('Valor da parcela deve ser maior que zero'),
}).refine((d) => d.installmentsPaid <= d.installmentsTotal, {
  message: 'Parcelas pagas não pode ser maior que o total de parcelas', path: ['installmentsPaid'],
});

export const financingSchema = z.object({
  kind: z.enum(['real_estate', 'vehicle', 'other']),
  financedAmount: z.number().min(0),
  outstandingBalance: z.number().positive('Saldo devedor deve ser maior que zero'),
  interestRate: z.number().min(0).max(1, 'Taxa parece muito alta -- use formato decimal'),
  termMonths: z.number().int().positive('Prazo deve ser maior que zero'),
  installmentsPaid: z.number().int().min(0),
  installmentAmount: z.number().positive('Valor da parcela deve ser maior que zero'),
}).refine((d) => d.installmentsPaid <= d.termMonths, {
  message: 'Parcelas pagas não pode ser maior que o prazo total', path: ['installmentsPaid'],
});

export const investmentSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(100),
  investmentClass: z.string(),
  investedAmount: z.number().min(0),
  currentAmount: z.number().positive('Valor atual deve ser maior que zero'),
});

export const budgetLimitSchema = z.object({
  categoryId: z.string().uuid('Categoria inválida'),
  limitAmount: z.number().positive('Limite deve ser maior que zero'),
});

export const recurringSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(100),
  amount: z.number().positive('Valor deve ser maior que zero'),
  categoryId: z.string().uuid().nullable(),
  frequency: z.enum(['weekly', 'monthly', 'yearly', 'custom']),
  dueDay: z.number().int().min(1).max(31),
  accountId: z.string().uuid().nullable(),
});

export const assetLiabilitySchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(100),
  kind: z.string().trim().max(50),
  value: z.number().positive('Valor deve ser maior que zero'),
});

/** Formata os erros do Zod numa string única, amigável para lançar como Error. */
export function formatZodError(error: z.ZodError): string {
  return error.errors.map((e) => e.message).join('; ');
}
