create table public.quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200),
  xp integer not null default 20 check (xp between 0 and 100000),
  due_on date,
  completed_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index quests_user_created_idx on public.quests (user_id, created_at);
alter table public.quests enable row level security;
revoke all on public.quests from anon;
grant select, insert, update, delete on public.quests to authenticated;
create policy quests_owner on public.quests for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create function public.touch_quest_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger quests_touch_updated_at before update on public.quests
for each row execute function public.touch_quest_updated_at();
