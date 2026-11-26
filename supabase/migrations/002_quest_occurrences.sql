alter table public.quests add column repeat_days integer not null default 0
  check (repeat_days between 0 and 365 and (repeat_days = 0 or due_on is not null));
alter table public.quests add column archived boolean not null default false;
alter table public.quests add column category text not null default '' check (length(category) <= 80);
alter table public.quests add column priority text not null default 'Normal' check (priority in ('Low','Normal','High','Urgent'));
alter table public.quests add column notes text not null default '' check (length(notes) <= 12000);
alter table public.quests add column weekdays integer[] not null default '{}'
  check (weekdays <@ array[0,1,2,3,4,5,6] and cardinality(weekdays) <= 7 and
    (cardinality(weekdays) = 0 or (repeat_days = 0 and due_on is not null)));

create table public.quest_xp_awards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_id uuid not null references public.quests(id) on delete cascade,
  slot text not null,
  day date not null,
  xp integer not null check (xp between 0 and 100000),
  reversed boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index quest_one_active_award on public.quest_xp_awards(quest_id, slot) where not reversed;
create index quest_awards_owner_day on public.quest_xp_awards(user_id, day);
alter table public.quest_xp_awards enable row level security;
revoke all on public.quest_xp_awards from public, anon, authenticated;
grant select on public.quest_xp_awards to authenticated;
create policy quest_awards_owner on public.quest_xp_awards for select to authenticated
  using ((select auth.uid()) = user_id);

insert into public.quest_xp_awards(user_id, quest_id, slot, day, xp)
select user_id, id, 'once', completed_on, xp from public.quests where completed_on is not null;

create function public.set_quest_completion(p_quest uuid, p_day date, p_complete boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  q public.quests;
  occurrence text;
begin
  select * into q from public.quests where id = p_quest and user_id = auth.uid() for update;
  if not found or q.archived then raise exception 'Quest unavailable'; end if;
  if p_day is null or p_complete is null then raise exception 'Completion date and state are required'; end if;
  occurrence := case when q.repeat_days = 0 and cardinality(q.weekdays) = 0 then 'once' else p_day::text end;
  if p_complete and q.repeat_days > 0 and
     (p_day < q.due_on or (p_day - q.due_on) % q.repeat_days <> 0)
  then raise exception 'Date is outside the quest schedule'; end if;
  if p_complete and cardinality(q.weekdays) > 0 and
     (p_day < q.due_on or not (extract(dow from p_day)::integer = any(q.weekdays)))
  then raise exception 'Date is outside the quest schedule'; end if;
  if p_complete then
    insert into public.quest_xp_awards(user_id, quest_id, slot, day, xp)
    values (q.user_id, q.id, occurrence, p_day, q.xp)
    on conflict (quest_id, slot) where not reversed do nothing;
  else
    update public.quest_xp_awards set reversed = true
    where quest_id = q.id and slot = occurrence and not reversed;
  end if;
end;
$$;
revoke all on function public.set_quest_completion(uuid, date, boolean) from public, anon;
grant execute on function public.set_quest_completion(uuid, date, boolean) to authenticated;

create function public.guard_quest_schedule() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (new.repeat_days <> old.repeat_days or new.weekdays is distinct from old.weekdays or
      ((new.repeat_days > 0 or cardinality(new.weekdays) > 0) and new.due_on is distinct from old.due_on))
     and exists(select 1 from public.quest_xp_awards where quest_id = old.id) then
    raise exception 'Archive this quest and create a new schedule to preserve its completion history.';
  end if;
  return new;
end;
$$;
create trigger quests_guard_schedule before update on public.quests
for each row execute function public.guard_quest_schedule();
