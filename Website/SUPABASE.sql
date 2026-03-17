-- Swift Cloud: Supabase schema for static website keys
--
-- Model: Static website generates a Swift key + URL and saves ONLY a hash to Supabase.

-- 1) Create table (stores ONLY hashes)
create table if not exists public.swift_keys (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  url text not null,
  key_hash text not null
);

create index if not exists swift_keys_key_hash_idx on public.swift_keys (key_hash);
create index if not exists swift_keys_url_idx on public.swift_keys (url);

-- 2) Validation RPC (does not expose rows)
create or replace function public.swift_validate_key(url text, key_hash text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.swift_keys k
    where k.url = swift_validate_key.url
      and k.key_hash = swift_validate_key.key_hash
  );
$$;

-- Allow the website + desktop (anon) to call the validator.
grant execute on function public.swift_validate_key(text, text) to anon;

-- 3) RLS: keep table private; allow inserts from the website only via anon key
alter table public.swift_keys enable row level security;

-- Allow anon inserts (website creates keys). No selects/updates/deletes.
drop policy if exists "swift_keys_insert_anon" on public.swift_keys;
create policy "swift_keys_insert_anon"
on public.swift_keys
for insert
to anon
with check (true);

-- ---------------------------------------------------------------------------
-- API keys (Swift) - static site generates key, stores hash only.
-- Note: without auth, listing is client-local (localStorage). Supabase stores hashes for validation/revocation.

create table if not exists public.swift_api_keys (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  label text null,
  project text null,
  key_hash text not null
);

create index if not exists swift_api_keys_key_hash_idx on public.swift_api_keys (key_hash);

alter table public.swift_api_keys enable row level security;

drop policy if exists "swift_api_keys_insert_anon" on public.swift_api_keys;
create policy "swift_api_keys_insert_anon"
on public.swift_api_keys
for insert
to anon
with check (true);

create or replace function public.swift_revoke_api_key(key_hash text)
returns boolean
language sql
security definer
set search_path = public
as $$
  with deleted as (
    delete from public.swift_api_keys k where k.key_hash = swift_revoke_api_key.key_hash returning 1
  )
  select exists(select 1 from deleted);
$$;

grant execute on function public.swift_revoke_api_key(text) to anon;

