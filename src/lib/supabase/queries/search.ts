import { createClient } from '@/lib/supabase/server';
export interface SearchResults { transactions: { id: string; description_raw: string; amount: number; occurred_at: string }[]; accounts: { id: string; name: string }[]; cards: { id: string; name: string }[]; goals: { id: string; name: string }[]; }
export async function globalSearch(query: string): Promise<SearchResults> {
  const supabase = createClient();
  const q = `%${query}%`;
  const [{ data: transactions }, { data: accounts }, { data: cards }, { data: goals }] = await Promise.all([
    supabase.from('transactions').select('id, description_raw, amount, occurred_at').ilike('description_raw', q).order('occurred_at', { ascending: false }).limit(20),
    supabase.from('accounts').select('id, name').ilike('name', q).eq('archived', false),
    supabase.from('cards').select('id, name').ilike('name', q).eq('archived', false),
    supabase.from('financial_goals').select('id, name').ilike('name', q),
  ]);
  return { transactions: transactions ?? [], accounts: accounts ?? [], cards: cards ?? [], goals: goals ?? [] };
}
