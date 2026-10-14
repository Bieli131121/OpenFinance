create extension if not exists pgsodium;

create table if not exists app_encryption_keys (name text primary key, key_id uuid not null);
do $$ declare existing_key_id uuid; begin
  select key_id into existing_key_id from app_encryption_keys where name = 'open_finance_tokens';
  if existing_key_id is null then insert into app_encryption_keys (name, key_id) values ('open_finance_tokens', (pgsodium.create_key()).id); end if;
end $$;

alter table open_finance_connections add column if not exists access_token_encrypted bytea, add column if not exists refresh_token_encrypted bytea;

create or replace function encrypt_of_token(plain_text text) returns bytea language plpgsql security definer set search_path = public, pgsodium as $$
declare key_id uuid; begin
  if plain_text is null then return null; end if;
  select ak.key_id into key_id from app_encryption_keys ak where ak.name = 'open_finance_tokens';
  return pgsodium.crypto_aead_det_encrypt(convert_to(plain_text, 'utf8'), convert_to('open_finance_connections', 'utf8'), key_id);
end; $$;

create or replace function decrypt_of_token(cipher bytea) returns text language plpgsql security definer set search_path = public, pgsodium as $$
declare key_id uuid; begin
  if cipher is null then return null; end if;
  select ak.key_id into key_id from app_encryption_keys ak where ak.name = 'open_finance_tokens';
  return convert_from(pgsodium.crypto_aead_det_decrypt(cipher, convert_to('open_finance_connections', 'utf8'), key_id), 'utf8');
end; $$;

update open_finance_connections set access_token_encrypted = encrypt_of_token(access_token), refresh_token_encrypted = encrypt_of_token(refresh_token) where access_token is not null or refresh_token is not null;
alter table open_finance_connections drop column if exists access_token;
alter table open_finance_connections drop column if exists refresh_token;

revoke execute on function encrypt_of_token(text) from public, anon;
revoke execute on function decrypt_of_token(bytea) from public, anon;
grant execute on function encrypt_of_token(text) to authenticated, service_role;
grant execute on function decrypt_of_token(bytea) to authenticated, service_role;

create table if not exists rate_limit_log (id uuid primary key default uuid_generate_v4(), user_id uuid not null references auth.users(id) on delete cascade, action text not null, created_at timestamptz not null default now());
create index if not exists idx_rate_limit_user_action_time on rate_limit_log(user_id, action, created_at);
alter table rate_limit_log enable row level security;
create policy "own rows" on rate_limit_log for all using (user_id = auth.uid());
