-- ============================================================
-- Migration 0003: criptografia dos tokens Open Finance + rate limiting
-- ============================================================

-- --------- 1. Criptografia em repouso dos tokens (pgsodium) ---------
-- Os tokens de acesso/refresh do Open Finance nunca devem ficar em texto
-- puro no banco. Usamos pgsodium (extensão nativa do Supabase) com uma
-- chave gerenciada pelo próprio Postgres -- a chave nunca é exposta à
-- aplicação, só o id dela.

create extension if not exists pgsodium;

-- Tabela de referência para a chave usada (pgsodium guarda a chave real
-- internamente em pgsodium.key; aqui só guardamos o id pra reutilizar).
create table if not exists app_encryption_keys (
  name text primary key,
  key_id uuid not null
);

do $$
declare
  existing_key_id uuid;
begin
  select key_id into existing_key_id from app_encryption_keys where name = 'open_finance_tokens';
  if existing_key_id is null then
    insert into app_encryption_keys (name, key_id)
    values ('open_finance_tokens', (pgsodium.create_key()).id);
  end if;
end $$;

-- Novas colunas criptografadas (bytea) substituindo o texto puro.
alter table open_finance_connections
  add column if not exists access_token_encrypted bytea,
  add column if not exists refresh_token_encrypted bytea;

-- Funções auxiliares de criptografar/descriptografar usando a chave acima.
-- crypto_aead_det_encrypt é determinístico (mesmo texto -> mesmo cifrado),
-- o que é aceitável aqui pois não precisamos comparar/buscar por token.
create or replace function encrypt_of_token(plain_text text)
returns bytea
language plpgsql
security definer
set search_path = public, pgsodium
as $$
declare
  key_id uuid;
begin
  if plain_text is null then return null; end if;
  select ak.key_id into key_id from app_encryption_keys ak where ak.name = 'open_finance_tokens';
  return pgsodium.crypto_aead_det_encrypt(
    convert_to(plain_text, 'utf8'),
    convert_to('open_finance_connections', 'utf8'),
    key_id
  );
end;
$$;

create or replace function decrypt_of_token(cipher bytea)
returns text
language plpgsql
security definer
set search_path = public, pgsodium
as $$
declare
  key_id uuid;
begin
  if cipher is null then return null; end if;
  select ak.key_id into key_id from app_encryption_keys ak where ak.name = 'open_finance_tokens';
  return convert_from(
    pgsodium.crypto_aead_det_decrypt(
      cipher,
      convert_to('open_finance_connections', 'utf8'),
      key_id
    ),
    'utf8'
  );
end;
$$;

-- Migra dados existentes (se houver) das colunas antigas para as criptografadas.
update open_finance_connections
set access_token_encrypted = encrypt_of_token(access_token),
    refresh_token_encrypted = encrypt_of_token(refresh_token)
where access_token is not null or refresh_token is not null;

-- Remove as colunas em texto puro -- a partir daqui, só as *_encrypted existem.
alter table open_finance_connections drop column if exists access_token;
alter table open_finance_connections drop column if exists refresh_token;

-- Restringe quem pode chamar as funções de criptografia (só o backend, via
-- role autenticada nas Server Actions/route handlers -- nunca client-side).
revoke execute on function encrypt_of_token(text) from public, anon;
revoke execute on function decrypt_of_token(bytea) from public, anon;
grant execute on function encrypt_of_token(text) to authenticated, service_role;
grant execute on function decrypt_of_token(bytea) to authenticated, service_role;

-- --------- 2. Rate limiting (contador simples por usuário/ação) ---------
create table if not exists rate_limit_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_rate_limit_user_action_time on rate_limit_log(user_id, action, created_at);

alter table rate_limit_log enable row level security;
create policy "own rows" on rate_limit_log for all using (user_id = auth.uid());

-- Housekeeping: linhas de rate limit não precisam durar mais que 1 dia.
-- (limpeza manual por enquanto; um cron job/edge function pode automatizar depois)
