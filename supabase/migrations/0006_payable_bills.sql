-- ============================================================
-- Migration 0006: boletos / contas a pagar (leitura de boleto por foto)
-- ============================================================
-- Depende da 0005 (função _apply_balance_delta e novas categorias).

create table if not exists payable_bills (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null check (char_length(btrim(description)) between 1 and 200),
  beneficiary text check (beneficiary is null or char_length(beneficiary) <= 200),
  amount numeric(14,2) not null check (amount > 0),
  due_date date not null,
  category_id uuid references transaction_categories(id),
  -- Código de barras canônico (44 dígitos) e linha digitável (47 ou 48 dígitos).
  barcode text check (barcode is null or barcode ~ '^[0-9]{44}$'),
  digitable_line text check (digitable_line is null or digitable_line ~ '^[0-9]{47,48}$'),
  status text not null default 'pending' check (status in ('pending', 'paid', 'canceled')),
  source text not null default 'manual' check (source in ('manual', 'scan')),
  scan_confidence numeric(3,2) check (scan_confidence is null or (scan_confidence >= 0 and scan_confidence <= 1)),
  paid_at timestamptz,
  paid_account_id uuid references accounts(id) on delete set null,
  payment_transaction_id uuid references transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- O mesmo boleto não entra duas vezes (foto repetida, duplo clique).
create unique index if not exists uq_payable_bills_user_barcode
  on payable_bills (user_id, barcode)
  where barcode is not null and status <> 'canceled';

create index if not exists idx_payable_bills_user_status_due
  on payable_bills (user_id, status, due_date);

alter table payable_bills enable row level security;

drop policy if exists "payable_bills: próprios" on payable_bills;
create policy "payable_bills: próprios" on payable_bills for all
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (payable_bills.category_id is null or exists (
      select 1 from transaction_categories c
       where c.id = payable_bills.category_id and (c.user_id is null or c.user_id = auth.uid())))
    and (payable_bills.paid_account_id is null or exists (
      select 1 from accounts a where a.id = payable_bills.paid_account_id and a.user_id = auth.uid()))
  );

-- Marca o boleto como pago: cria a despesa, ajusta o saldo da conta e muda o
-- status — tudo na mesma transação (ver _apply_balance_delta na 0005).
create or replace function pay_bill(p_bill_id uuid, p_account_id uuid, p_paid_at timestamptz default now())
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_bill payable_bills;
  v_tx_id uuid;
begin
  if v_user is null then raise exception 'Não autenticado' using errcode = '28000'; end if;

  select * into v_bill from payable_bills where id = p_bill_id and user_id = v_user for update;
  if not found then raise exception 'Boleto não encontrado' using errcode = 'P0002'; end if;
  if v_bill.status <> 'pending' then raise exception 'Este boleto já foi baixado ou cancelado'; end if;

  perform _apply_balance_delta(p_account_id, -v_bill.amount);

  insert into transactions (user_id, account_id, description_raw, description_normalized,
                            amount, type, occurred_at, category_id, notes)
  values (v_user, p_account_id, 'Boleto: ' || v_bill.description, upper(btrim('Boleto: ' || v_bill.description)),
          -v_bill.amount, 'expense', p_paid_at, v_bill.category_id, v_bill.beneficiary)
  returning id into v_tx_id;

  update payable_bills
     set status = 'paid', paid_at = p_paid_at, paid_account_id = p_account_id,
         payment_transaction_id = v_tx_id, updated_at = now()
   where id = v_bill.id;

  return v_tx_id;
end;
$$;

revoke execute on function pay_bill(uuid, uuid, timestamptz) from public, anon;
grant execute on function pay_bill(uuid, uuid, timestamptz) to authenticated;
