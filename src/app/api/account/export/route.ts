import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { logAudit } from '@/lib/security/audit';
import { NextResponse } from 'next/server';
const TABLES = ['accounts', 'account_balances', 'cards', 'credit_card_invoices', 'transactions', 'recurring_transactions', 'financial_rules', 'budgets', 'budget_categories', 'financial_goals', 'loans', 'loan_installments', 'financings', 'financing_installments', 'investments', 'investment_transactions', 'assets', 'liabilities', 'notifications', 'open_finance_connections', 'user_settings'] as const;
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const rateLimit = await checkRateLimit('account.export', 5, 60);
  if (!rateLimit.allowed) return NextResponse.json({ error: 'Muitas exportações recentes. Tente novamente mais tarde.' }, { status: 429 });
  const exportData: Record<string, unknown> = { exported_at: new Date().toISOString(), user: { id: user.id, email: user.email } };
  for (const table of TABLES) { const { data } = await supabase.from(table).select('*'); exportData[table] = data ?? []; }
  await logAudit('account.export', 'user', user.id);
  return new NextResponse(JSON.stringify(exportData, null, 2), { headers: { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="meus-dados-openfinance-hub.json"' } });
}
