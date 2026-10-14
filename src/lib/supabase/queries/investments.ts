import { createClient } from '@/lib/supabase/server';
export interface Investment { id: string; name: string; class: string | null; invested_amount: number; current_amount: number; }
const CLASS_LABELS: Record<string, string> = { treasury: 'Tesouro', cdb: 'CDB', lci: 'LCI', lca: 'LCA', funds: 'Fundos', stocks: 'Ações', etf: 'ETFs', crypto: 'Criptomoedas', savings: 'Poupança', other: 'Outros' };
export { CLASS_LABELS };
export async function getInvestments(): Promise<Investment[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('investments').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
export async function getTotalInvested(): Promise<number> { const investments = await getInvestments(); return investments.reduce((s, i) => s + Number(i.current_amount), 0); }
export async function createInvestment(input: { name: string; investmentClass: string; investedAmount: number; currentAmount: number }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  const { error } = await supabase.from('investments').insert({ user_id: user.id, name: input.name, class: input.investmentClass, invested_amount: input.investedAmount, current_amount: input.currentAmount });
  if (error) throw error;
}
export async function updateInvestment(id: string, input: { currentAmount: number }) {
  const supabase = createClient();
  const { error } = await supabase.from('investments').update({ current_amount: input.currentAmount }).eq('id', id);
  if (error) throw error;
}
export async function deleteInvestment(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('investments').delete().eq('id', id);
  if (error) throw error;
}
