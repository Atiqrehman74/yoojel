-- Tracks in-flight image/video/voice generations so a push notification can
-- be sent when one finishes. Needed because generation jobs are discovered
-- as complete by the *browser* polling /api/*/result -- if the user closes
-- the app, nothing ever learns the job finished. Muapi calls
-- /api/webhooks/muapi on completion, which looks the job up here and
-- notifies the person who started it.
--
-- Run once in the Supabase SQL Editor.

create table if not exists public.pending_generations (
  -- Minted by us before the job is submitted, because Muapi's callback URL
  -- has to be built before its own request id exists.
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  -- Push notifications are addressed by email (see components/AppilixBridge.tsx),
  -- captured at submit time so the webhook needs no auth lookup of its own.
  user_email text,
  kind text not null check (kind in ('image', 'video', 'voice')),
  -- Muapi's request id, filled in once the submit call returns. Null until
  -- then, and stays null if the job never started.
  request_id text unique,
  -- pending : still running, nobody has been told
  -- seen    : the user's own browser polled it to completion -- don't notify
  -- notified: a push was sent
  -- failed  : generation failed and the user was told
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists pending_generations_request_id_idx
  on public.pending_generations (request_id);

create index if not exists pending_generations_status_created_at_idx
  on public.pending_generations (status, created_at desc);

grant select, insert, update, delete on public.pending_generations to service_role;
