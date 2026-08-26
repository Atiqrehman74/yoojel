-- Persists Yoojel Coder generations (prompt + files) per-user so past runs
-- survive a page reload, backing both the Coder history panel and the
-- Library page's "Code" tab. Run once in the Supabase SQL Editor.

create table if not exists public.code_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  prompt text not null,
  files jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists code_generations_user_id_created_at_idx
  on public.code_generations (user_id, created_at desc);

grant select, insert, delete on public.code_generations to service_role;
