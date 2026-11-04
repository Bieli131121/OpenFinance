import { createClient } from '@/lib/supabase/server';
import type { AccountWithBalance, AccountType } from '@/types/database';

export async function getAccountsWithBalances(): Promise<AccountWithBalance[]> {
  const supabase = createClient();
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('archived', false)
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!accounts?.length) return [];

  // View com UM registro (o mais recente) por conta -- antes carregava o histórico
  // inteiro de saldos de todas as contas a cada página.
  const { data: balances, error: balanceError } = await supabase
    .from('account_latest_balances')
    .select('account_id, current_balance')
    .in('account_id', accounts.map((a) => a.id));
  if (balanceError) throw balanceError;

  const byAccount = new Map((balances ?? []).map((b) => [b.account_id as string, Number(b.current_balance)]));
  return accounts.map((acc) => ({ ...acc, latest_balance: byAccount.get(acc.id) ?? 0 }));
}

/** Cria a conta e o saldo inicial na MESMA transação do banco (função SQL). */
export async function createManualAccount(input: { name: string; type: AccountType; initialBalance: number }) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('create_account_with_balance', {
    p_name: input.name, p_type: input.type, p_initial_balance: input.initialBalance,
  });
  if (error) throw new Error(error.message);
  return data as { id: string };
}

/** Exclusão "soft" -- arquiva em vez de apagar, preservando o histórico de transações ligadas. */
export async function archiveAccount(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('accounts').update({ archived: true }).eq('id', id);
  if (error) throw error;
}

export async function getTotalBalance(): Promise<number> {
  const accounts = await getAccountsWithBalances();
  return accounts.reduce((sum, a) => sum + Number(a.latest_balance), 0);
}
