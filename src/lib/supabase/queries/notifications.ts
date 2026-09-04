import { createClient } from '@/lib/supabase/server';

export interface Notification {
  id: string; type: string; title: string; message: string | null; read: boolean; created_at: string;
}

export async function getNotifications(): Promise<Notification[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function markNotificationRead(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
  if (error) throw error;
}

async function alertExists(supabase: ReturnType<typeof createClient>, type: string, titleContains: string, since: string) {
  const { data } = await supabase.from('notifications').select('id').eq('type', type).ilike('title', `%${titleContains}%`).gte('created_at', since).maybeSingle();
  return !!data;
}

/**
 * Gera notificações a partir de condições simples. Chamada sob demanda a
 * partir da página de notificações -- em produção isso rodaria como job
 * agendado (ex: Supabase Edge Function com cron), não a cada carregamento.
 */
export async function generateAutomaticAlerts() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const todayIso = new Date().toISOString().slice(0, 10);
  const dayStart = todayIso + 'T00:00:00.000Z';

  // --- 1. Orçamento estourado ---
  const referenceMonth = new Date().toISOString().slice(0, 7) + '-01';
  const { data: budget } = await supabase.from('budgets').select('id').eq('reference_month', referenceMonth).maybeSingle();
  if (budget) {
    const { data: budgetCategories } = await supabase
      .from('budget_categories').select('category_id, limit_amount, category:transaction_categories(name)').eq('budget_id', budget.id);
    const monthStart = referenceMonth + 'T00:00:00.000Z';
    const { data: transactions } = await supabase.from('transactions').select('category_id, amount').eq('type', 'expense').gte('occurred_at', monthStart);

    for (const bc of budgetCategories ?? []) {
      const spent = (transactions ?? []).filter((t) => t.category_id === bc.category_id).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
      if (spent >= Number(bc.limit_amount)) {
        const catName = (bc as any).category?.name ?? '';
        if (!(await alertExists(supabase, 'budget_exceeded', catName, monthStart))) {
          await supabase.from('notifications').insert({
            user_id: user.id, type: 'budget_exceeded', title: `Orçamento de ${catName} atingido`,
            message: `Você já gastou ${spent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} do limite de ${Number(bc.limit_amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`,
          });
        }
      }
    }
  }

  // --- 2. Saldo baixo (conta abaixo de R$ 100) ---
  const { data: accounts } = await supabase.from('accounts').select('id, name').eq('archived', false);
  for (const acc of accounts ?? []) {
    const { data: balance } = await supabase
      .from('account_balances').select('current_balance').eq('account_id', acc.id).order('recorded_at', { ascending: false }).limit(1).maybeSingle();
    if (balance && Number(balance.current_balance) < 100) {
      if (!(await alertExists(supabase, 'low_balance', acc.name, dayStart))) {
        await supabase.from('notifications').insert({
          user_id: user.id, type: 'low_balance', title: `Saldo baixo em ${acc.name}`,
          message: `Saldo atual: ${Number(balance.current_balance).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`,
        });
      }
    }
  }

  // --- 3. Fatura próxima do vencimento (próximos 5 dias) ---
  const in5Days = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data: invoices } = await supabase
    .from('credit_card_invoices').select('id, due_date, total_amount, card:cards(name)')
    .neq('status', 'paid').gte('due_date', todayIso).lte('due_date', in5Days);

  for (const inv of invoices ?? []) {
    const cardName = (inv as any).card?.name ?? 'cartão';
    if (!(await alertExists(supabase, 'invoice_due', cardName, dayStart))) {
      await supabase.from('notifications').insert({
        user_id: user.id, type: 'invoice_due', title: `Fatura do ${cardName} vence em breve`,
        message: `Vencimento em ${new Date(inv.due_date!).toLocaleDateString('pt-BR')} — ${Number(inv.total_amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`,
      });
    }
  }

  // --- 4. Meta atrasada (progresso menor que o esperado pelo tempo decorrido) ---
  const { data: goals } = await supabase.from('financial_goals').select('id, name, target_amount, current_amount, target_date, created_at').not('target_date', 'is', null);
  for (const goal of goals ?? []) {
    const start = new Date(goal.created_at).getTime();
    const end = new Date(goal.target_date!).getTime();
    const now = Date.now();
    if (now >= end) continue; // já venceu, não é "atrasada", é "vencida" -- fora de escopo aqui
    const expectedProgress = (now - start) / (end - start);
    const actualProgress = Number(goal.target_amount) > 0 ? Number(goal.current_amount) / Number(goal.target_amount) : 0;
    if (expectedProgress > 0.2 && actualProgress < expectedProgress - 0.15) {
      if (!(await alertExists(supabase, 'goal_behind', goal.name, dayStart))) {
        await supabase.from('notifications').insert({
          user_id: user.id, type: 'goal_behind', title: `Meta "${goal.name}" atrasada`,
          message: `Progresso atual: ${(actualProgress * 100).toFixed(0)}% — esperado: ${(expectedProgress * 100).toFixed(0)}% pelo tempo decorrido.`,
        });
      }
    }
  }
}
