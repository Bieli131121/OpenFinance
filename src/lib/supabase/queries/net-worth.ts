import { createClient } from '@/lib/supabase/server';
import { getTotalBalance } from './accounts';
import { getTotalInvested } from './investments';
import { getTotalDebts } from './loans';

export interface Asset { id: string; name: string; kind: string | null; value: number }
export interface Liability { id: string; name: string; kind: string | null; value: number }

export async function getAssets(): Promise<Asset[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('assets').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getLiabilities(): Promise<Liability[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('liabilities').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createAsset(input: { name: string; kind: string; value: number }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  const { error } = await supabase.from('assets').insert({ user_id: user.id, name: input.name, kind: input.kind, value: input.value });
  if (error) throw error;
}

export async function createLiability(input: { name: string; kind: string; value: number }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  const { error } = await supabase.from('liabilities').insert({ user_id: user.id, name: input.name, kind: input.kind, value: input.value });
  if (error) throw error;
}

export async function deleteAsset(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('assets').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteLiability(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('liabilities').delete().eq('id', id);
  if (error) throw error;
}

export interface NetWorthBreakdown {
  totalAssets: number; totalLiabilities: number; netWorth: number;
  assetBreakdown: { label: string; value: number }[]; liabilityBreakdown: { label: string; value: number }[];
}

export async function getNetWorthBreakdown(): Promise<NetWorthBreakdown> {
  const [accountsBalance, invested, debts, assets, liabilities] = await Promise.all([
    getTotalBalance(), getTotalInvested(), getTotalDebts(), getAssets(), getLiabilities(),
  ]);

  const otherAssets = assets.reduce((s, a) => s + Number(a.value), 0);
  const otherLiabilities = liabilities.reduce((s, l) => s + Number(l.value), 0);
  const totalAssets = accountsBalance + invested + otherAssets;
  const totalLiabilities = debts + otherLiabilities;

  return {
    totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities,
    assetBreakdown: [{ label: 'Contas', value: accountsBalance }, { label: 'Investimentos', value: invested }, ...assets.map((a) => ({ label: a.name, value: Number(a.value) }))],
    liabilityBreakdown: [{ label: 'Dívidas/Empréstimos', value: debts }, ...liabilities.map((l) => ({ label: l.name, value: Number(l.value) }))],
  };
}
