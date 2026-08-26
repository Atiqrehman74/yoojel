-- Persists Projects server-side (previously localStorage-only, meaning
-- projects never survived a cleared cache or a different device). Run once
-- in the Supabase SQL Editor.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_id_created_at_idx
  on public.projects (user_id, created_at desc);

grant select, insert, update, delete on public.projects to service_role;
