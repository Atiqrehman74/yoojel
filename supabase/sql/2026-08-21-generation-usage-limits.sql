-- Adds monthly usage counters for Pro-plan image/video generation.
-- Run once in the Supabase SQL Editor.

alter table public.profiles
  add column if not exists image_count integer not null default 0,
  add column if not exists video_count integer not null default 0,
  add column if not exists usage_period text not null default to_char(now(), 'YYYY-MM');

-- Atomically checks the caller's usage against p_limit for the current
-- calendar month, resetting counts if the month has rolled over, and
-- increments on success. Returns the new count, or -1 if the limit was
-- already reached (nothing is incremented in that case).
create or replace function public.increment_generation_usage(
  p_user_id uuid,
  p_kind text, -- 'image' or 'video'
  p_limit integer
) returns integer as $$
declare
  v_period text := to_char(now(), 'YYYY-MM');
  v_current_period text;
  v_image_count integer;
  v_video_count integer;
  v_count integer;
begin
  select usage_period, image_count, video_count
    into v_current_period, v_image_count, v_video_count
    from public.profiles
    where id = p_user_id
    for update;

  if not found then
    return -1;
  end if;

  if v_current_period is distinct from v_period then
    v_image_count := 0;
    v_video_count := 0;
  end if;

  v_count := case when p_kind = 'image' then v_image_count else v_video_count end;

  if v_count >= p_limit then
    update public.profiles
      set usage_period = v_period, image_count = v_image_count, video_count = v_video_count
      where id = p_user_id;
    return -1;
  end if;

  v_count := v_count + 1;

  if p_kind = 'image' then
    update public.profiles
      set usage_period = v_period, image_count = v_count, video_count = v_video_count
      where id = p_user_id;
  else
    update public.profiles
      set usage_period = v_period, video_count = v_count, image_count = v_image_count
      where id = p_user_id;
  end if;

  return v_count;
end;
$$ language plpgsql security definer;

grant execute on function public.increment_generation_usage(uuid, text, integer) to service_role;
