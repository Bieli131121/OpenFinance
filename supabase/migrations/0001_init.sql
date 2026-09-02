-- ============================================================
-- OPENFINANCE HUB — Migration 0001: schema inicial
-- Todas as tabelas usam UUID, timestamps e RLS por usuário.
-- ============================================================

create extension if not exists "uuid-ossp";

-- ---------- USERS / SETTINGS ----------
create table user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  currency text not null default 'BRL',
  monthly_income numeric(14,2),
  dashboard_layout jsonb default '{}'::jsonb,
  privacy_mode boolean not null default false,
  theme text not null default 'system' check (theme in ('light','dark','system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- OPEN FINANCE ----------
create table institutions (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  logo_url text,
  provider_key text not null,          -- identifica o provider (ex: 'mock', 'pluggy', 'belvo')
  external_id text,                    -- id da instituição no provider
  created_at timestamptz not null default now()
);

create table open_finance_connections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  institution_id uuid not null references institutions(id),
  provider_key text not null,
  external_connection_id text,         -- id da conexão/consentimento no provider
  access_token text,                   -- sempre criptografado em repouso (pgsodium/KMS)
  refresh_token text,
  status text not null default 'pending' check (status in ('pending','connected','expired','revoked','error')),
  consent_expires_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table sync_logs (
  id uuid primary key default uuid_generate_v4(),
  connection_id uuid not null references open_finance_connections(id) on delete cascade,
  status text not null check (status in ('success','partial','error')),
  accounts_synced int default 0,
  transactions_synced int default 0,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

-- ---------- ACCOUNTS ----------
create table accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid references open_finance_connections(id) on delete set null,
  institution_id uuid references institutions(id),
  name text not null,
  type text not null check (type in ('checking','savings','salary','payment','investment','cash','other')),
  external_account_id text,
  is_manual boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table account_balances (
  id uuid primary key default uuid_generate_v4(),
  account_id uuid not null references accounts(id) on delete cascade,
  current_balance numeric(14,2) not null default 0,
  available_balance numeric(14,2),
  recorded_at timestamptz not null default now()
);

-- ---------- CARDS ----------
create table cards (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid references open_finance_connections(id) on delete set null,
  institution_id uuid references institutions(id),
  name text not null,
  brand text,
  last_four text,
  credit_limit numeric(14,2),
  available_limit numeric(14,2),
  closing_day int,
  due_day int,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table credit_card_invoices (
  id uuid primary key default uuid_generate_v4(),
  card_id uuid not null references cards(id) on delete cascade,
  reference_month date not null,
  total_amount numeric(14,2) not null default 0,
  status text not null default 'open' check (status in ('open','closed','paid','overdue')),
  due_date date,
  closing_date date,
  created_at timestamptz not null default now(),
  unique (card_id, reference_month)
);

-- ---------- CATEGORIES ----------
create table transaction_categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  icon text,
  color text,
  kind text not null check (kind in ('income','expense')),
  created_at timestamptz not null default now()
);

create table transaction_subcategories (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid not null references transaction_categories(id) on delete cascade,
  name text not null
);

-- ---------- TRANSACTIONS ----------
create table transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references accounts(id) on delete set null,
  card_id uuid references cards(id) on delete set null,
  invoice_id uuid references credit_card_invoices(id) on delete set null,
  category_id uuid references transaction_categories(id),
  subcategory_id uuid references transaction_subcategories(id),
  external_id text,
  occurred_at timestamptz not null,
  description_raw text not null,
  description_normalized text,
  merchant text,
  amount numeric(14,2) not null,
  type text not null check (type in ('income','expense','transfer','investment','redemption','card_payment','adjustment')),
  payment_method text,
  status text not null default 'posted' check (status in ('pending','posted','canceled')),
  is_recurring boolean not null default false,
  installment_number int,
  installment_total int,
  notes text,
  tags text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, external_id)
);
create index idx_transactions_user_date on transactions(user_id, occurred_at desc);
create index idx_transactions_category on transactions(category_id);

-- ---------- RECURRING / RULES ----------
create table recurring_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric(14,2) not null,
  category_id uuid references transaction_categories(id),
  frequency text not null check (frequency in ('weekly','monthly','yearly','custom')),
  due_day int,
  account_id uuid references accounts(id),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table financial_rules (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  match_field text not null default 'description_raw',
  match_type text not null check (match_type in ('contains','equals','starts_with','regex')),
  match_value text not null,
  set_category_id uuid references transaction_categories(id),
  set_subcategory_id uuid references transaction_subcategories(id),
  priority int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- BUDGETS ----------
create table budgets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reference_month date not null,
  created_at timestamptz not null default now(),
  unique (user_id, reference_month)
);

create table budget_categories (
  id uuid primary key default uuid_generate_v4(),
  budget_id uuid not null references budgets(id) on delete cascade,
  category_id uuid not null references transaction_categories(id),
  limit_amount numeric(14,2) not null
);

-- ---------- GOALS ----------
create table financial_goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text check (kind in ('emergency_fund','trip','house','car','investment','other')),
  target_amount numeric(14,2) not null,
  current_amount numeric(14,2) not null default 0,
  target_date date,
  created_at timestamptz not null default now()
);

-- ---------- DEBTS / LOANS ----------
create table loans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  creditor text not null,
  original_amount numeric(14,2) not null,
  outstanding_balance numeric(14,2) not null,
  interest_rate numeric(7,4),
  installments_total int not null,
  installments_paid int not null default 0,
  installment_amount numeric(14,2) not null,
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

create table loan_installments (
  id uuid primary key default uuid_generate_v4(),
  loan_id uuid not null references loans(id) on delete cascade,
  number int not null,
  due_date date not null,
  amount numeric(14,2) not null,
  paid boolean not null default false,
  paid_at timestamptz
);

-- ---------- FINANCINGS ----------
create table financings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text check (kind in ('real_estate','vehicle','other')),
  financed_amount numeric(14,2) not null,
  outstanding_balance numeric(14,2) not null,
  interest_rate numeric(7,4),
  term_months int not null,
  installments_paid int not null default 0,
  installment_amount numeric(14,2) not null,
  start_date date,
  created_at timestamptz not null default now()
);

create table financing_installments (
  id uuid primary key default uuid_generate_v4(),
  financing_id uuid not null references financings(id) on delete cascade,
  number int not null,
  due_date date not null,
  amount numeric(14,2) not null,
  interest_portion numeric(14,2),
  principal_portion numeric(14,2),
  paid boolean not null default false
);

-- ---------- INVESTMENTS ----------
create table investments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid references open_finance_connections(id) on delete set null,
  name text not null,
  class text check (class in ('treasury','cdb','lci','lca','funds','stocks','etf','crypto','savings','other')),
  invested_amount numeric(14,2) not null default 0,
  current_amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table investment_transactions (
  id uuid primary key default uuid_generate_v4(),
  investment_id uuid not null references investments(id) on delete cascade,
  type text not null check (type in ('deposit','withdrawal','yield')),
  amount numeric(14,2) not null,
  occurred_at timestamptz not null default now()
);

-- ---------- NET WORTH (ativos/passivos avulsos) ----------
create table assets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text check (kind in ('vehicle','real_estate','other')),
  value numeric(14,2) not null,
  created_at timestamptz not null default now()
);

create table liabilities (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text,
  value numeric(14,2) not null,
  created_at timestamptz not null default now()
);

-- ---------- NOTIFICATIONS / AUDIT ----------
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY — usuário só acessa os próprios dados
-- ============================================================
do $$
declare t text;
begin
  for t in
    select unnest(array[
      'user_settings','open_finance_connections','accounts','account_balances',
      'cards','credit_card_invoices','transactions','recurring_transactions',
      'financial_rules','budgets','budget_categories','financial_goals','loans',
      'loan_installments','financings','financing_installments','investments',
      'investment_transactions','assets','liabilities','notifications','audit_logs'
    ])
  loop
    execute format('alter table %I enable row level security;', t);
  end loop;
end $$;

create policy "own rows" on user_settings for all using (user_id = auth.uid());
create policy "own rows" on open_finance_connections for all using (user_id = auth.uid());
create policy "own rows" on accounts for all using (user_id = auth.uid());
create policy "own rows" on cards for all using (user_id = auth.uid());
create policy "own rows" on transactions for all using (user_id = auth.uid());
create policy "own rows" on recurring_transactions for all using (user_id = auth.uid());
create policy "own rows" on financial_rules for all using (user_id = auth.uid());
create policy "own rows" on budgets for all using (user_id = auth.uid());
create policy "own rows" on financial_goals for all using (user_id = auth.uid());
create policy "own rows" on loans for all using (user_id = auth.uid());
create policy "own rows" on financings for all using (user_id = auth.uid());
create policy "own rows" on investments for all using (user_id = auth.uid());
create policy "own rows" on assets for all using (user_id = auth.uid());
create policy "own rows" on liabilities for all using (user_id = auth.uid());
create policy "own rows" on notifications for all using (user_id = auth.uid());

create policy "via account" on account_balances for all using (
  exists (select 1 from accounts a where a.id = account_balances.account_id and a.user_id = auth.uid())
);
create policy "via card" on credit_card_invoices for all using (
  exists (select 1 from cards c where c.id = credit_card_invoices.card_id and c.user_id = auth.uid())
);
create policy "via budget" on budget_categories for all using (
  exists (select 1 from budgets b where b.id = budget_categories.budget_id and b.user_id = auth.uid())
);
create policy "via loan" on loan_installments for all using (
  exists (select 1 from loans l where l.id = loan_installments.loan_id and l.user_id = auth.uid())
);
create policy "via financing" on financing_installments for all using (
  exists (select 1 from financings f where f.id = financing_installments.financing_id and f.user_id = auth.uid())
);
create policy "via investment" on investment_transactions for all using (
  exists (select 1 from investments i where i.id = investment_transactions.investment_id and i.user_id = auth.uid())
);

alter table institutions enable row level security;
create policy "public read" on institutions for select using (true);
alter table transaction_categories enable row level security;
create policy "own or system categories" on transaction_categories for select using (user_id = auth.uid() or user_id is null);
create policy "manage own categories" on transaction_categories for insert with check (user_id = auth.uid());
create policy "update own categories" on transaction_categories for update using (user_id = auth.uid());
create policy "delete own categories" on transaction_categories for delete using (user_id = auth.uid());
