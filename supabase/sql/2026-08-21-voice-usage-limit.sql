-- Adds a third monthly usage counter for voice generation, and updates
-- increment_generation_usage() to handle it. Run once in the Supabase SQL
-- Editor. Safe to run even though the function already exists: this is a
-- CREATE OR REPLACE with the same signature, so existing grants still apply.
--
-- The original version of this function only branched between 'image' and
-- 'video' (else-branch caught everything else) -- calling it with 'voice'
-- would have silently incremented video_count instead. This replaces that
-- two-way branch with an explicit three-way one.

alter table public.profiles
  add column if not exists voice_count integer not null default 0;

create or replace function public.increment_generation_usage(
  p_user_id uuid,
  p_kind text, -- 'image', 'video', or 'voice'
  p_limit integer
) returns integer as $$
declare
  v_period text := to_char(now(), 'YYYY-MM');
  v_current_period text;
  v_image_count integer;
  v_video_count integer;
  v_voice_count integer;
  v_count integer;
begin
  select usage_period, image_count, video_count, voice_count
    into v_current_period, v_image_count, v_video_count, v_voice_count
    from public.profiles
    where id = p_user_id
    for update;

  if not found then
    return -1;
  end if;

  if v_current_period is distinct from v_period then
    v_image_count := 0;
    v_video_count := 0;
    v_voice_count := 0;
  end if;

  v_count := case p_kind
    when 'image' then v_image_count
    when 'video' then v_video_count
    else v_voice_count
  end;

  if v_count >= p_limit then
    update public.profiles
      set usage_period = v_period, image_count = v_image_count, video_count = v_video_count, voice_count = v_voice_count
      where id = p_user_id;
    return -1;
  end if;

  v_count := v_count + 1;

  update public.profiles
    set
      usage_period = v_period,
      image_count = case when p_kind = 'image' then v_count else v_image_count end,
      video_count = case when p_kind = 'video' then v_count else v_video_count end,
      voice_count = case when p_kind = 'voice' then v_count else v_voice_count end
    where id = p_user_id;

  return v_count;
end;
$$ language plpgsql security definer;

grant execute on function public.increment_generation_usage(uuid, text, integer) to service_role;
