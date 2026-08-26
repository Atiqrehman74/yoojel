-- Persists per-user cloned voices (Voice Studio -> "Clone a voice") so a
-- cloned voice_id can be reused across sessions instead of being lost on
-- reload. Run once in the Supabase SQL Editor.

create table if not exists public.cloned_voices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  voice_id text not null unique,
  name text not null,
  preview_url text,
  created_at timestamptz not null default now()
);

create index if not exists cloned_voices_user_id_created_at_idx
  on public.cloned_voices (user_id, created_at desc);

grant select, insert, delete on public.cloned_voices to service_role;
