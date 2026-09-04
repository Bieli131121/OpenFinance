export type AccountType = 'checking' | 'savings' | 'salary' | 'payment' | 'investment' | 'cash' | 'other';

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  is_manual: boolean;
  archived: boolean;
  created_at: string;
}

export interface AccountBalance {
  id: string;
  account_id: string;
  current_balance: number;
  available_balance: number | null;
  recorded_at: string;
}

export interface AccountWithBalance extends Account {
  latest_balance: number;
}

export interface Card {
  id: string;
  user_id: string;
  name: string;
  brand: string | null;
  last_four: string | null;
  credit_limit: number | null;
  available_limit: number | null;
  closing_day: number | null;
  due_day: number | null;
  archived: boolean;
}

export interface CreditCardInvoice {
  id: string;
  card_id: string;
  reference_month: string;
  total_amount: number;
  status: 'open' | 'closed' | 'paid' | 'overdue';
  due_date: string | null;
}

export type TransactionType =
  | 'income' | 'expense' | 'transfer' | 'investment' | 'redemption' | 'card_payment' | 'adjustment';

export interface TransactionCategory {
  id: string;
  user_id: string | null;
  name: string;
  icon: string | null;
  kind: 'income' | 'expense';
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string | null;
  card_id: string | null;
  category_id: string | null;
  occurred_at: string;
  description_raw: string;
  merchant: string | null;
  amount: number;
  type: TransactionType;
  status: 'pending' | 'posted' | 'canceled';
  notes: string | null;
  category?: TransactionCategory | null;
}
