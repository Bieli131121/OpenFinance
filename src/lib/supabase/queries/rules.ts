import { createClient } from '@/lib/supabase/server';

export interface FinancialRule {
  id: string;
  match_type: 'contains' | 'equals' | 'starts_with' | 'regex';
  match_value: string;
  active: boolean;
  category?: { id: string; name: string; icon: string | null } | null;
  subcategory?: { id: string; name: string } | null;
}

export async function getFinancialRules(): Promise<FinancialRule[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('financial_rules')
    .select('id, match_type, match_value, active, category:transaction_categories(id, name, icon), subcategory:transaction_subcategories(id, name)')
    .order('priority', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as FinancialRule[];
}

export async function createFinancialRule(input: { matchType: string; matchValue: string; categoryId: string }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  const { error } = await supabase.from('financial_rules').insert({
    user_id: user.id, match_field: 'description_raw', match_type: input.matchType,
    match_value: input.matchValue, set_category_id: input.categoryId, active: true,
  });
  if (error) throw error;
}

export async function deleteFinancialRule(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('financial_rules').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Aplica as regras do usuário (por prioridade) a uma descrição de transação.
 * Retorna o category_id encontrado, ou null se nenhuma regra bateu -- nesse
 * caso quem chama pode cair no fallback de palavras-chave embutido
 * (suggestCategoryName, em categorization.ts).
 */
export async function applyUserRules(descriptionRaw: string): Promise<string | null> {
  const supabase = createClient();
  const { data: rules } = await supabase
    .from('financial_rules')
    .select('match_type, match_value, set_category_id')
    .eq('active', true)
    .order('priority', { ascending: false });

  if (!rules?.length) return null;
  const desc = descriptionRaw.toUpperCase();

  for (const rule of rules) {
    const value = rule.match_value.toUpperCase();
    let matched = false;
    switch (rule.match_type) {
      case 'contains': matched = desc.includes(value); break;
      case 'equals': matched = desc === value; break;
      case 'starts_with': matched = desc.startsWith(value); break;
      case 'regex':
        try { matched = new RegExp(rule.match_value, 'i').test(descriptionRaw); } catch { matched = false; }
        break;
    }
    if (matched && rule.set_category_id) return rule.set_category_id;
  }
  return null;
}
