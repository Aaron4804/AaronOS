alter table public.tracker_entries drop constraint tracker_entries_kind_check;
alter table public.tracker_entries add constraint tracker_entries_kind_check check (kind in
  ('exercises','plans','workouts','sets','templates','records','foods','meals','diets','recipes',
   'ingredients','measurements','projects','milestones','work','focus','career','habits','habitlogs',
   'routines','routinelogs','wellness','coding','learning','finance','accounts','budgets','subscriptions',
   'events','goals','journal','settings','adjustments','timer','achievements','mealtemplates'));
create unique index tracker_achievement_owner_code
  on public.tracker_entries (user_id, (fields->>'code')) where kind = 'achievements';
alter table public.tracker_entries add constraint tracker_achievement_code
  check (kind <> 'achievements' or coalesce(fields->>'code','') in ('first-quest','ten-quests','week-streak','first-workout'));
