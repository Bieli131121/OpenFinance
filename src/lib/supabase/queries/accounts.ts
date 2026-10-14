import { createClient } from '@/lib/supabase/server';
import type { AccountWithBalance, AccountType } from '@/types/database';
export async function getAccountsWithBalances(): Promise<AccountWithBalance[]> {
  const supabase = createClient();
  const { data: accounts, error } = await supabase.from('accounts').select('*').eq('archived', false).order('created_at', { ascending: true });
  if (error) throw error;
  if (!accounts?.length) return [];
  const { data: balances } = await supabase.from('account_balances').select('account_id, current_balance, recorded_at').in('account_id', accounts.map((a) => a.id)).order('recorded_at', { ascending: false });
  return accounts.map((acc) => ({ ...acc, latest_balance: balances?.find((b) => b.account_id === acc.id)?.current_balance ?? 0 }));
}
export async function createManualAccount(input: { name: string; type: AccountType; initialBalance: number }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  const { data: account, error } = await supabase.from('accounts').insert({ user_id: user.id, name: input.name, type: input.type, is_manual: true }).select().single();
  if (error) throw error;
  const { error: balanceError } = await supabase.from('account_balances').insert({ account_id: account.id, current_balance: input.initialBalance, available_balance: input.initialBalance });
  if (balanceError) throw balanceError;
  return account;
}
export async function archiveAccount(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('accounts').update({ archived: true }).eq('id', id);
  if (error) throw error;
}
export async function getTotalBalance(): Promise<number> {
  const accounts = await getAccountsWithBalances();
  return accounts.reduce((sum, a) => sum + Number(a.latest_balance), 0);
}
