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
as $$
  select exists(
    select 1
    from public.swift_keys k
    where k.url = swift_validate_key.url
      and k.key_hash = swift_validate_key.key_hash
  );
$$;

-- 3) RLS: keep table private; allow inserts from the website only via anon key
alter table public.swift_keys enable row level security;

-- Allow anon inserts (website creates keys). No selects/updates/deletes.
drop policy if exists "swift_keys_insert_anon" on public.swift_keys;
create policy "swift_keys_insert_anon"
on public.swift_keys
for insert
to anon
with check (true);

