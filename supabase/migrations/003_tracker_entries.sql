-- Shared typed-at-the-application-boundary storage for independently editable tracker entries.
create table public.tracker_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('exercises','plans','workouts','sets','templates','records','foods','meals','diets','recipes','ingredients','measurements','projects','milestones','work','focus','career','habits','habitlogs','routines','routinelogs','wellness','coding','learning','finance','accounts','budgets','subscriptions','events','goals','journal','settings','adjustments','timer')),
  title text not null check (length(btrim(title)) between 1 and 200),
  day date not null,
  fields jsonb not null default '{}' check (jsonb_typeof(fields) = 'object' and octet_length(fields::text) <= 65536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tracker_owner_kind_day on public.tracker_entries(user_id, kind, day desc);
create unique index tracker_singletons on public.tracker_entries(user_id, kind) where kind in ('settings', 'timer');
alter table public.tracker_entries enable row level security;
revoke all on public.tracker_entries from public, anon;
grant select, insert, update, delete on public.tracker_entries to authenticated;
create policy tracker_entries_owner on public.tracker_entries for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create trigger tracker_touch_updated_at before update on public.tracker_entries
  for each row execute function public.touch_quest_updated_at();

create function public.finish_tracker_timer(timer_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  t public.tracker_entries;
  seconds numeric;
  focus_seconds numeric;
  short_seconds numeric;
  long_seconds numeric;
  cycle_seconds numeric;
  remainder numeric;
  productive numeric;
  i integer;
begin
  select * into t from public.tracker_entries
  where id = timer_id and user_id = auth.uid() and kind = 'timer' for update;
  if not found then return; end if;
  if coalesce(t.fields->>'target', '') not in ('work','focus','workouts') then
    raise exception 'Invalid timer type';
  end if;
  seconds := greatest(0, coalesce((t.fields->>'carried')::numeric,0));
  if coalesce((t.fields->>'started')::numeric,0) > 0 then
    seconds := seconds + greatest(0, floor(extract(epoch from now()) - (t.fields->>'started')::numeric / 1000));
  end if;
  if t.fields->>'target' = 'focus' and t.fields->>'mode' = 'pomodoro' then
    focus_seconds := greatest(1, round((t.fields->>'focus')::numeric * 60));
    short_seconds := greatest(1, round((t.fields->>'shortBreak')::numeric * 60));
    long_seconds := greatest(1, round((t.fields->>'longBreak')::numeric * 60));
    cycle_seconds := 4 * focus_seconds + 3 * short_seconds + long_seconds;
    remainder := mod(seconds, cycle_seconds);
    productive := floor(seconds / cycle_seconds) * 4 * focus_seconds;
    for i in 1..4 loop
      productive := productive + least(focus_seconds, greatest(0, remainder));
      remainder := remainder - focus_seconds - short_seconds;
    end loop;
    seconds := productive;
  end if;
  insert into public.tracker_entries(id, user_id, kind, title, day, fields)
  values ((t.fields->>'result')::uuid, t.user_id, t.fields->>'target', t.title, t.day,
    jsonb_strip_nulls(jsonb_build_object('minutes', round(seconds/60,2), 'project', t.fields->'project')))
  on conflict (id) do update set fields = tracker_entries.fields || excluded.fields || '{"status":"Completed"}'::jsonb
  where tracker_entries.user_id = t.user_id and tracker_entries.kind = 'workouts' and excluded.kind = 'workouts';
  if not found then raise exception 'Timer destination already exists'; end if;
  delete from public.tracker_entries where id = t.id;
end;
$$;
revoke all on function public.finish_tracker_timer(uuid) from public, anon;
grant execute on function public.finish_tracker_timer(uuid) to authenticated;

create function public.validate_tracker_fields() returns trigger
language plpgsql set search_path = '' as $$
declare
  field_name text;
  value jsonb;
  positive_fields text[] := array['weight','reps','number','rpe','rir','rest','serving','quantity',
    'calories','protein','carbs','fat','fiber','sugar','sodium','water','steps','distance',
    'minutes','breaks','amount','started','carried','repeat','xpPerLevel','servings'];
begin
  foreach field_name in array positive_fields loop
    value := new.fields->field_name;
    if value is null or value = '""'::jsonb then continue; end if;
    if jsonb_typeof(value) <> 'number' or (value #>> '{}')::numeric < 0 then
      raise exception 'Invalid nonnegative number: %', field_name;
    end if;
  end loop;
  if new.kind = 'foods' and coalesce(nullif(new.fields->>'serving','')::numeric, 0) <= 0 then
    raise exception 'Food requires a positive base quantity';
  end if;
  if new.kind in ('finance','budgets','subscriptions') and coalesce(nullif(new.fields->>'amount','')::numeric, 0) < 0.01 then
    raise exception 'Amount must be at least 0.01';
  end if;
  if new.kind = 'finance' and coalesce(new.fields->>'direction','') not in ('Income','Expense','Transfer') then
    raise exception 'Choose a transaction kind';
  end if;
  if new.kind = 'work' and coalesce(nullif(new.fields->>'breaks','')::numeric,0) >
     coalesce(nullif(new.fields->>'minutes','')::numeric,0) then
    raise exception 'Break time cannot exceed session duration';
  end if;
  if new.kind = 'adjustments' and (
    jsonb_typeof(new.fields->'delta') is distinct from 'number'
    or abs((new.fields->>'delta')::numeric) > 100000
    or trunc((new.fields->>'delta')::numeric) <> (new.fields->>'delta')::numeric
    or length(btrim(coalesce(new.fields->>'notes',''))) = 0
  ) then raise exception 'Adjustment requires a whole XP amount and reason';
  end if;
  return new;
end;
$$;
create trigger tracker_validate_fields before insert or update on public.tracker_entries
for each row execute function public.validate_tracker_fields();

create function public.delete_tracker_children() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if old.kind in ('workouts','plans','recipes') then
    delete from public.tracker_entries where user_id = old.user_id and (
      (old.kind = 'workouts' and kind = 'sets' and fields->>'workout' = old.id::text) or
      (old.kind = 'plans' and kind = 'templates' and fields->>'plan' = old.id::text) or
      (old.kind = 'recipes' and kind = 'ingredients' and fields->>'recipe' = old.id::text)
    );
  end if;
  return old;
end;
$$;
create trigger tracker_delete_children after delete on public.tracker_entries
for each row execute function public.delete_tracker_children();
