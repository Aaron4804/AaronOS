create table public.tracker_xp_awards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid not null,
  kind text not null,
  day date not null,
  xp integer not null check (xp between 0 and 100000),
  reversed boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index tracker_award_active on public.tracker_xp_awards(source_id) where not reversed;
create index tracker_award_owner_day on public.tracker_xp_awards(user_id, day);
alter table public.tracker_xp_awards enable row level security;
revoke all on public.tracker_xp_awards from public, anon, authenticated;
grant select on public.tracker_xp_awards to authenticated;
create policy tracker_awards_read_own on public.tracker_xp_awards for select to authenticated using ((select auth.uid()) = user_id);

create function public.sync_tracker_xp() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  entry public.tracker_entries;
  eligible boolean;
  points integer;
  setting jsonb;
begin
  if tg_op = 'UPDATE' and (new.kind <> old.kind or new.user_id <> old.user_id or new.id <> old.id) then
    raise exception 'Tracker identity cannot change';
  end if;
  if tg_op = 'DELETE' then entry := old; else entry := new; end if;
  if entry.kind not in ('workouts','focus','habitlogs','coding','milestones') then return null; end if;
  eligible := case entry.kind
    when 'workouts' then coalesce(entry.fields->>'status','') <> 'Planned'
    when 'focus' then coalesce(nullif(entry.fields->>'minutes','')::numeric,0) >= 1
    when 'habitlogs' then coalesce(nullif(entry.fields->>'amount','')::numeric,0) > 0
    when 'coding' then entry.fields->>'solved' = 'Yes'
    when 'milestones' then entry.fields->>'status' = 'Completed'
    end;
  if tg_op = 'DELETE' or not coalesce(eligible, false) then
    update public.tracker_xp_awards set reversed = true
    where source_id = entry.id and user_id = entry.user_id and not reversed;
    return null;
  end if;
  points := case entry.kind when 'workouts' then 50 when 'focus' then 25 when 'habitlogs' then 10 when 'coding' then 30 else 100 end;
  select fields -> ('reward_' || entry.kind) into setting from public.tracker_entries where user_id = entry.user_id and kind = 'settings';
  if jsonb_typeof(setting) = 'number' then points := greatest(0, least(100000, round((setting #>> '{}')::numeric))); end if;
  insert into public.tracker_xp_awards(user_id, source_id, kind, day, xp)
    values(entry.user_id, entry.id, entry.kind, entry.day, points)
    on conflict (source_id) where not reversed do nothing;
  return null;
end;
$$;
revoke all on function public.sync_tracker_xp() from public, anon, authenticated;
create trigger tracker_xp_sync after insert or update or delete on public.tracker_entries
for each row execute function public.sync_tracker_xp();
