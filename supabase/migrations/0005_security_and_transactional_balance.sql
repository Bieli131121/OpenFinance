-- ============================================================
-- Migration 0005: correções de segurança e de consistência de saldo
--
--   1. RLS nas tabelas que estavam abertas
--      (sync_logs, transaction_subcategories, app_encryption_keys)
--   2. audit_logs imutável para o usuário (só leitura + insert do próprio)
--      e rate_limit_log sem DELETE (senão o usuário apaga o contador)
--   3. Funções de criptografia: só service_role (antes qualquer usuário
--      logado podia descriptografar o token de QUALQUER conexão)
--   4. Unicidade de categorias (+ deduplicação do que já existe)
--   5. Saldo e pagamento de fatura TRANSACIONAIS (funções SQL com lock)
--
-- Seguro para rodar mais de uma vez.
-- ============================================================

-- ---------- 1. RLS nas tabelas que estavam sem ----------
-- No Supabase toda tabela do schema public é exposta pela API. Sem RLS,
-- qualquer usuário (até anônimo, com a anon key) lia e escrevia nessas tabelas.

alter table sync_logs enable row level security;
drop policy if exists "sync_logs: leitura própria" on sync_logs;
create policy "sync_logs: leitura própria" on sync_logs for select using (
  exists (select 1 from open_finance_connections c where c.id = sync_logs.connection_id and c.user_id = auth.uid())
);
-- INSERT/UPDATE/DELETE: só o backend com service_role (que ignora RLS).

alter table transaction_subcategories enable row level security;
drop policy if exists "subcategorias: leitura" on transaction_subcategories;
drop policy if exists "subcategorias: insert" on transaction_subcategories;
drop policy if exists "subcategorias: update" on transaction_subcategories;
drop policy if exists "subcategorias: delete" on transaction_subcategories;
create policy "subcategorias: leitura" on transaction_subcategories for select using (
  exists (select 1 from transaction_categories c
          where c.id = transaction_subcategories.category_id and (c.user_id is null or c.user_id = auth.uid()))
);
create policy "subcategorias: insert" on transaction_subcategories for insert with check (
  exists (select 1 from transaction_categories c
          where c.id = transaction_subcategories.category_id and c.user_id = auth.uid())
);
create policy "subcategorias: update" on transaction_subcategories for update
  using (exists (select 1 from transaction_categories c where c.id = transaction_subcategories.category_id and c.user_id = auth.uid()))
  with check (exists (select 1 from transaction_categories c where c.id = transaction_subcategories.category_id and c.user_id = auth.uid()));
create policy "subcategorias: delete" on transaction_subcategories for delete using (
  exists (select 1 from transaction_categories c
          where c.id = transaction_subcategories.category_id and c.user_id = auth.uid())
);

-- Tabela interna (mapeia nome -> id da chave de criptografia): ninguém pelo
-- cliente. RLS ligado e SEM policies = acesso negado para anon/authenticated.
alter table app_encryption_keys enable row level security;
revoke all on app_encryption_keys from public, anon, authenticated;

-- ---------- 2. audit_logs e rate_limit_log ----------
-- Antes: "for all using (user_id = auth.uid())" -> o usuário podia editar e
-- apagar os próprios logs de auditoria (e as linhas do rate limit).
drop policy if exists "own rows" on audit_logs;
drop policy if exists "audit_logs: leitura própria" on audit_logs;
drop policy if exists "audit_logs: insert próprio" on audit_logs;
create policy "audit_logs: leitura própria" on audit_logs for select using (user_id = auth.uid());
create policy "audit_logs: insert próprio" on audit_logs for insert with check (user_id = auth.uid());
revoke update, delete, truncate on audit_logs from anon, authenticated;
revoke all on audit_logs from anon;

drop policy if exists "own rows" on rate_limit_log;
drop policy if exists "rate_limit_log: leitura própria" on rate_limit_log;
drop policy if exists "rate_limit_log: insert próprio" on rate_limit_log;
create policy "rate_limit_log: leitura própria" on rate_limit_log for select using (user_id = auth.uid());
create policy "rate_limit_log: insert próprio" on rate_limit_log for insert with check (user_id = auth.uid());
revoke update, delete, truncate on rate_limit_log from anon, authenticated;
revoke all on rate_limit_log from anon;

-- Policy de transactions: além de user_id, a conta/cartão referenciados também
-- precisam ser do usuário (antes dava para apontar para a conta de outra pessoa).
drop policy if exists "own rows" on transactions;
drop policy if exists "transactions: próprias" on transactions;
create policy "transactions: próprias" on transactions for all
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (transactions.account_id is null or exists (
      select 1 from accounts a where a.id = transactions.account_id and a.user_id = auth.uid()))
    and (transactions.card_id is null or exists (
      select 1 from cards c where c.id = transactions.card_id and c.user_id = auth.uid()))
  );

-- ---------- 3. Funções de criptografia: somente service_role ----------
-- Eram SECURITY DEFINER, sem checar dono, e com GRANT para `authenticated`:
-- qualquer usuário logado podia chamar decrypt_of_token(<bytea de outro usuário>).
create or replace function encrypt_of_token(plain_text text)
returns bytea
language plpgsql
security definer
set search_path = public, pgsodium, pg_temp
as $$
declare
  v_key_id uuid;
begin
  if plain_text is null then return null; end if;
  select ak.key_id into v_key_id from app_encryption_keys ak where ak.name = 'open_finance_tokens';
  return pgsodium.crypto_aead_det_encrypt(
    convert_to(plain_text, 'utf8'),
    convert_to('open_finance_connections', 'utf8'),
    v_key_id
  );
end;
$$;

create or replace function decrypt_of_token(cipher bytea)
returns text
language plpgsql
security definer
set search_path = public, pgsodium, pg_temp
as $$
declare
  v_key_id uuid;
begin
  if cipher is null then return null; end if;
  select ak.key_id into v_key_id from app_encryption_keys ak where ak.name = 'open_finance_tokens';
  return convert_from(
    pgsodium.crypto_aead_det_decrypt(
      cipher,
      convert_to('open_finance_connections', 'utf8'),
      v_key_id
    ),
    'utf8'
  );
end;
$$;

revoke execute on function encrypt_of_token(text) from public, anon, authenticated;
revoke execute on function decrypt_of_token(bytea) from public, anon, authenticated;
grant execute on function encrypt_of_token(text) to service_role;
grant execute on function decrypt_of_token(bytea) to service_role;

-- ---------- 4. Categorias: deduplicar e impor unicidade ----------
do $$
declare
  r record;
  dupes uuid[];
begin
  for r in
    select (array_agg(id order by created_at, id))[1] as keep_id,
           array_agg(id order by created_at, id) as ids
    from transaction_categories
    group by coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(btrim(name)), kind
    having count(*) > 1
  loop
    dupes := r.ids[2:array_length(r.ids, 1)];
    update transactions            set category_id     = r.keep_id where category_id     = any(dupes);
    update recurring_transactions  set category_id     = r.keep_id where category_id     = any(dupes);
    update financial_rules         set set_category_id = r.keep_id where set_category_id = any(dupes);
    update transaction_subcategories set category_id   = r.keep_id where category_id     = any(dupes);
    update budget_categories       set category_id     = r.keep_id where category_id     = any(dupes);
    delete from transaction_categories where id = any(dupes);
  end loop;
end $$;

create unique index if not exists uq_transaction_categories_scope_name_kind
  on transaction_categories (
    coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(btrim(name)),
    kind
  );

-- Mesma categoria duas vezes no mesmo orçamento (a unir após o merge acima).
delete from budget_categories a using budget_categories b
 where a.budget_id = b.budget_id and a.category_id = b.category_id and a.id > b.id;
create unique index if not exists uq_budget_categories_budget_category
  on budget_categories (budget_id, category_id);

-- Novas categorias do sistema (usadas na leitura de boletos).
insert into transaction_categories (user_id, name, icon, kind)
select null, v.name, v.icon, 'expense'
from (values
  ('Contas de consumo',            '💡'),
  ('Internet e Telefone',          '📡'),
  ('Impostos e Taxas',             '🏛️'),
  ('Seguros',                      '🛡️'),
  ('Financiamentos e Empréstimos', '🏦')
) as v(name, icon)
on conflict do nothing;

-- ---------- 5. Saldo transacional ----------
-- O saldo da conta é o último registro de account_balances. O código antigo fazia
-- "ler último saldo" -> "inserir novo" em chamadas separadas: duas requisições
-- simultâneas liam o mesmo saldo e uma sobrescrevia a outra (saldo errado), e se
-- a segunda chamada falhasse a transação ficava gravada sem o saldo ajustado.
--
-- Agora tudo roda DENTRO de uma transação do Postgres, com a linha da conta
-- travada (SELECT ... FOR UPDATE). As funções são SECURITY INVOKER: a RLS do
-- usuário continua valendo, então ninguém mexe em conta alheia.

-- Último saldo de cada conta (sem varrer o histórico inteiro a cada consulta).
create or replace view account_latest_balances with (security_invoker = true) as
select distinct on (account_id)
       account_id, current_balance, available_balance, recorded_at
from account_balances
order by account_id, recorded_at desc, id desc;
grant select on account_latest_balances to authenticated;

create index if not exists idx_account_balances_account_time on account_balances(account_id, recorded_at desc);

create or replace function _apply_balance_delta(p_account_id uuid, p_delta numeric)
returns numeric
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_current numeric(14,2);
  v_new numeric(14,2);
begin
  -- Trava a conta até o fim da transação. Sob RLS, conta de outro usuário
  -- simplesmente "não existe" aqui.
  perform 1 from accounts where id = p_account_id and user_id = auth.uid() for update;
  if not found then
    raise exception 'Conta não encontrada' using errcode = 'P0002';
  end if;

  select current_balance into v_current
    from account_balances
   where account_id = p_account_id
   order by recorded_at desc, id desc
   limit 1;

  v_new := coalesce(v_current, 0) + p_delta;

  -- clock_timestamp() (e não now()): now() é o início da transação e duas
  -- transações concorrentes poderiam gravar fora de ordem.
  insert into account_balances (account_id, current_balance, available_balance, recorded_at)
  values (p_account_id, v_new, v_new, clock_timestamp());

  return v_new;
end;
$$;

create or replace function create_account_with_balance(p_name text, p_type text, p_initial_balance numeric)
returns accounts
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_account accounts;
begin
  if v_user is null then raise exception 'Não autenticado' using errcode = '28000'; end if;

  insert into accounts (user_id, name, type, is_manual)
  values (v_user, p_name, p_type, true)
  returning * into v_account;

  insert into account_balances (account_id, current_balance, available_balance, recorded_at)
  values (v_account.id, coalesce(p_initial_balance, 0), coalesce(p_initial_balance, 0), clock_timestamp());

  return v_account;
end;
$$;

create or replace function create_transaction_with_balance(
  p_account_id uuid,
  p_description text,
  p_amount numeric,
  p_type text,
  p_occurred_at timestamptz,
  p_category_id uuid default null,
  p_notes text default null
)
returns transactions
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_tx transactions;
begin
  if v_user is null then raise exception 'Não autenticado' using errcode = '28000'; end if;

  perform _apply_balance_delta(p_account_id, p_amount);

  insert into transactions (user_id, account_id, description_raw, description_normalized,
                            amount, type, occurred_at, category_id, notes)
  values (v_user, p_account_id, p_description, upper(btrim(p_description)),
          p_amount, p_type, p_occurred_at, p_category_id, p_notes)
  returning * into v_tx;

  return v_tx;
end;
$$;

create or replace function update_transaction_with_balance(
  p_id uuid,
  p_description text,
  p_amount numeric,
  p_occurred_at timestamptz
)
returns transactions
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_old transactions;
  v_new transactions;
begin
  select * into v_old from transactions where id = p_id and user_id = auth.uid() for update;
  if not found then raise exception 'Transação não encontrada' using errcode = 'P0002'; end if;

  if v_old.account_id is not null and p_amount <> v_old.amount then
    perform _apply_balance_delta(v_old.account_id, p_amount - v_old.amount);
  end if;

  update transactions
     set description_raw = p_description,
         description_normalized = upper(btrim(p_description)),
         amount = p_amount,
         occurred_at = p_occurred_at,
         updated_at = now()
   where id = p_id
   returning * into v_new;

  return v_new;
end;
$$;

create or replace function delete_transaction_with_balance(p_id uuid)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_old transactions;
begin
  select * into v_old from transactions where id = p_id and user_id = auth.uid() for update;
  if not found then raise exception 'Transação não encontrada' using errcode = 'P0002'; end if;

  if v_old.account_id is not null then
    perform _apply_balance_delta(v_old.account_id, -v_old.amount);
  end if;

  delete from transactions where id = p_id;
end;
$$;

-- Pagamento de fatura: lançamento do débito + saldo + status da fatura + limite
-- do cartão, tudo ou nada. Pagar duas vezes a mesma fatura (duplo clique, duas
-- abas) falha na segunda porque a linha da fatura fica travada e o status muda.
create or replace function pay_invoice(p_invoice_id uuid, p_account_id uuid)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_inv credit_card_invoices;
  v_card cards;
  v_amount numeric(14,2);
  v_tx_id uuid;
begin
  if v_user is null then raise exception 'Não autenticado' using errcode = '28000'; end if;

  select i.* into v_inv
    from credit_card_invoices i
    join cards c on c.id = i.card_id and c.user_id = v_user
   where i.id = p_invoice_id
     for update of i;
  if not found then raise exception 'Fatura não encontrada' using errcode = 'P0002'; end if;
  if v_inv.status = 'paid' then raise exception 'Esta fatura já foi paga'; end if;

  v_amount := abs(v_inv.total_amount);
  if v_amount = 0 then raise exception 'Fatura sem valor a pagar'; end if;

  select * into v_card from cards where id = v_inv.card_id;

  perform _apply_balance_delta(p_account_id, -v_amount);

  insert into transactions (user_id, account_id, invoice_id, description_raw, description_normalized,
                            amount, type, occurred_at)
  values (v_user, p_account_id, v_inv.id, 'Pagamento fatura ' || coalesce(v_card.name, 'cartão'),
          'PAGAMENTO FATURA', -v_amount, 'card_payment', now())
  returning id into v_tx_id;

  update credit_card_invoices set status = 'paid' where id = v_inv.id;

  update cards
     set available_limit = greatest(
           coalesce(credit_limit, 0) - coalesce((
             select sum(total_amount) from credit_card_invoices
              where card_id = v_card.id and status <> 'paid'), 0), 0)
   where id = v_card.id;

  return v_tx_id;
end;
$$;

-- Só usuários logados chamam (anon e public não).
revoke execute on function _apply_balance_delta(uuid, numeric) from public, anon;
revoke execute on function create_account_with_balance(text, text, numeric) from public, anon;
revoke execute on function create_transaction_with_balance(uuid, text, numeric, text, timestamptz, uuid, text) from public, anon;
revoke execute on function update_transaction_with_balance(uuid, text, numeric, timestamptz) from public, anon;
revoke execute on function delete_transaction_with_balance(uuid) from public, anon;
revoke execute on function pay_invoice(uuid, uuid) from public, anon;
grant execute on function _apply_balance_delta(uuid, numeric) to authenticated;
grant execute on function create_account_with_balance(text, text, numeric) to authenticated;
grant execute on function create_transaction_with_balance(uuid, text, numeric, text, timestamptz, uuid, text) to authenticated;
grant execute on function update_transaction_with_balance(uuid, text, numeric, timestamptz) to authenticated;
grant execute on function delete_transaction_with_balance(uuid) to authenticated;
grant execute on function pay_invoice(uuid, uuid) to authenticated;
