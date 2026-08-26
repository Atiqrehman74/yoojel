-- Persists generated images/videos per-user so they survive a page reload
-- (the "Library" feature) instead of only living in in-memory session state.
-- Run once in the Supabase SQL Editor.

create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null check (kind in ('image', 'video')),
  prompt text not null,
  url text not null,
  created_at timestamptz not null default now()
);

create index if not exists generations_user_id_kind_created_at_idx
  on public.generations (user_id, kind, created_at desc);

grant select, insert, delete on public.generations to service_role;
