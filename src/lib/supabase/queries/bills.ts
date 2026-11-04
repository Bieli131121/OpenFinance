import { createClient } from '@/lib/supabase/server';
import { monthBounds, todayISODate } from '@/lib/date';

export interface PayableBill {
  id: string;
  description: string;
  beneficiary: string | null;
  amount: number;
  due_date: string; // 'YYYY-MM-DD'
  category_id: string | null;
  digitable_line: string | null;
  barcode: string | null;
  status: 'pending' | 'paid' | 'canceled';
  source: 'manual' | 'scan';
  paid_at: string | null;
  category?: { id: string; name: string; icon: string | null } | null;
}

const SELECT = 'id, description, beneficiary, amount, due_date, category_id, digitable_line, barcode, status, source, paid_at, category:transaction_categories(id, name, icon)';

export async function getPendingBills(): Promise<PayableBill[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('payable_bills').select(SELECT).eq('status', 'pending').order('due_date', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as PayableBill[];
}

export async function getRecentPaidBills(limit = 10): Promise<PayableBill[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('payable_bills').select(SELECT).eq('status', 'paid').order('paid_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as PayableBill[];
}

/** Boletos pendentes com vencimento no mês atual (para o calendário). */
export async function getBillsDueThisMonth(): Promise<PayableBill[]> {
  const supabase = createClient();
  const { startDate, endDate } = monthBounds(0);
  const { data, error } = await supabase
    .from('payable_bills').select(SELECT).eq('status', 'pending')
    .gte('due_date', startDate).lt('due_date', endDate).order('due_date', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as PayableBill[];
}

/** Total a pagar em boletos pendentes: vencidos + próximos `days` dias. */
export async function getBillsTotals(days = 30): Promise<{ overdue: number; upcoming: number; overdueCount: number; upcomingCount: number }> {
  const supabase = createClient();
  const today = todayISODate();
  const limit = addDaysISO(today, days);
  const { data, error } = await supabase
    .from('payable_bills').select('amount, due_date').eq('status', 'pending').lte('due_date', limit);
  if (error) throw error;

  let overdue = 0, upcoming = 0, overdueCount = 0, upcomingCount = 0;
  for (const b of data ?? []) {
    if (b.due_date < today) { overdue += Number(b.amount); overdueCount++; }
    else { upcoming += Number(b.amount); upcomingCount++; }
  }
  return { overdue, upcoming, overdueCount, upcomingCount };
}

export async function findBillByBarcode(barcode: string): Promise<{ id: string; status: string } | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('payable_bills').select('id, status').eq('barcode', barcode).neq('status', 'canceled').limit(1);
  return data?.[0] ?? null;
}

export async function createBill(input: {
  description: string; beneficiary: string | null; amount: number; dueDate: string; categoryId: string | null;
  barcode: string | null; digitableLine: string | null; source: 'manual' | 'scan'; scanConfidence: number | null;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  const { data, error } = await supabase.from('payable_bills').insert({
    user_id: user.id,
    description: input.description,
    beneficiary: input.beneficiary,
    amount: input.amount,
    due_date: input.dueDate,
    category_id: input.categoryId,
    barcode: input.barcode,
    digitable_line: input.digitableLine,
    source: input.source,
    scan_confidence: input.scanConfidence,
  }).select('id').single();

  if (error) {
    // 23505 = violação do índice único (user_id, barcode): o boleto já foi cadastrado.
    if (error.code === '23505') throw new Error('Este boleto já está cadastrado.');
    throw new Error(error.message);
  }
  return data;
}

export async function payBill(billId: string, accountId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc('pay_bill', { p_bill_id: billId, p_account_id: accountId });
  if (error) throw new Error(error.message);
}

export async function deleteBill(id: string) {
  const supabase = createClient();
  // Só apaga pendente: boleto pago está ligado a uma transação já lançada na conta.
  const { error } = await supabase.from('payable_bills').delete().eq('id', id).eq('status', 'pending');
  if (error) throw error;
}

function addDaysISO(dateOnly: string, days: number): string {
  const [y, m, d] = dateOnly.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

