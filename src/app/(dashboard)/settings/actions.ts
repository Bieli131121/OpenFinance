'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/**
 * Popula a conta do usuário com dados fictícios claramente identificados como DEMO,
 * para ele explorar o app sem precisar cadastrar tudo manualmente primeiro.
 */
export async function seedDemoDataAction() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  const { data: account } = await supabase
    .from('accounts')
    .insert({ user_id: user.id, name: '[DEMO] Conta Corrente', type: 'checking', is_manual: true })
    .select()
    .single();

  if (account) {
    await supabase.from('account_balances').insert({ account_id: account.id, current_balance: 5230, available_balance: 5230 });

    const today = new Date();
    await supabase.from('transactions').insert([
      { user_id: user.id, account_id: account.id, description_raw: '[DEMO] SALARIO', description_normalized: 'SALARIO', amount: 8000, type: 'income', occurred_at: today.toISOString() },
      { user_id: user.id, account_id: account.id, description_raw: '[DEMO] IFOOD', description_normalized: 'IFOOD', amount: -45.9, type: 'expense', occurred_at: today.toISOString() },
      { user_id: user.id, account_id: account.id, description_raw: '[DEMO] SUPERMERCADO', description_normalized: 'SUPERMERCADO', amount: -320, type: 'expense', occurred_at: today.toISOString() },
    ]);
  }

  await supabase.from('cards').insert({
    user_id: user.id, name: '[DEMO] Cartão Nubank', brand: 'mastercard', last_four: '4242',
    credit_limit: 10000, available_limit: 7200, closing_day: 20, due_day: 27,
  });

  await supabase.from('financial_goals').insert({
    user_id: user.id, name: '[DEMO] Reserva de emergência', kind: 'emergency_fund',
    target_amount: 20000, current_amount: 8000,
  });

  await supabase.from('investments').insert({
    user_id: user.id, name: '[DEMO] Tesouro Selic 2029', class: 'treasury', invested_amount: 5000, current_amount: 5340,
  });

  revalidatePath('/dashboard');
  revalidatePath('/accounts');
  revalidatePath('/cards');
  revalidatePath('/goals');
  revalidatePath('/investments');
}
