-- Persists Deep Research reports (topic + depth + report + sources) per-user
-- so past runs survive a page reload, backing both the Deep Research
-- history panel and the Library page's "Research" tab. Run once in the
-- Supabase SQL Editor.

create table if not exists public.research_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  topic text not null,
  depth text not null,
  report text not null,
  sources jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index if not exists research_generations_user_id_created_at_idx
  on public.research_generations (user_id, created_at desc);

grant select, insert, delete on public.research_generations to service_role;
