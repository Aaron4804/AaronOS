create function public.export_aaronos_backup() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'format', 'AaronOS', 'version', 1,
    'quests', coalesce((select jsonb_agg(to_jsonb(q) - 'user_id' order by q.created_at, q.id) from public.quests q where q.user_id = auth.uid()), '[]'),
    'questAwards', coalesce((select jsonb_agg(to_jsonb(q) - 'user_id' order by q.created_at, q.id) from public.quest_xp_awards q where q.user_id = auth.uid()), '[]'),
    'entries', coalesce((select jsonb_agg(to_jsonb(e) - 'user_id' order by e.created_at, e.id) from public.tracker_entries e where e.user_id = auth.uid()), '[]'),
    'trackerAwards', coalesce((select jsonb_agg(to_jsonb(a) - 'user_id' order by a.created_at, a.id) from public.tracker_xp_awards a where a.user_id = auth.uid()), '[]')
  )
$$;

create function public.restore_aaronos_backup(backup jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  owner uuid := auth.uid();
  section text;
begin
  if owner is null then raise exception 'Sign in first'; end if;
  if backup->>'format' is distinct from 'AaronOS' or backup->'version' is distinct from '1'::jsonb
     or octet_length(backup::text) > 10000000 then raise exception 'Invalid backup format'; end if;
  foreach section in array array['quests','questAwards','entries','trackerAwards'] loop
    if jsonb_typeof(backup->section) is distinct from 'array' or jsonb_array_length(backup->section) > 50000 then
      raise exception 'Invalid backup section';
    end if;
  end loop;
  perform pg_advisory_xact_lock(hashtextextended(owner::text, 0));
  delete from public.quests where user_id = owner;
  delete from public.tracker_entries where user_id = owner;
  insert into public.quests(id,user_id,title,xp,due_on,completed_on,repeat_days,archived,category,priority,notes,weekdays,created_at,updated_at)
  select id,owner,title,xp,due_on,completed_on,coalesce(repeat_days,0),coalesce(archived,false),coalesce(category,''),coalesce(priority,'Normal'),coalesce(notes,''),coalesce(weekdays,'{}'),coalesce(created_at,now()),coalesce(updated_at,now())
  from jsonb_populate_recordset(null::public.quests, backup->'quests');
  if exists (
    select 1 from jsonb_populate_recordset(null::public.quest_xp_awards, backup->'questAwards') a
    where not exists (select 1 from public.quests q where q.id = a.quest_id and q.user_id = owner)
      or (a.slot <> 'once' and a.slot <> a.day::text)
  ) then raise exception 'Invalid quest award reference'; end if;
  insert into public.quest_xp_awards(id,user_id,quest_id,slot,day,xp,reversed,created_at)
  select id,owner,quest_id,slot,day,xp,reversed,coalesce(created_at,now())
  from jsonb_populate_recordset(null::public.quest_xp_awards, backup->'questAwards');
  insert into public.tracker_entries(id,user_id,kind,title,day,fields,created_at,updated_at)
  select id,owner,kind,title,day,fields,coalesce(created_at,now()),coalesce(updated_at,now())
  from jsonb_populate_recordset(null::public.tracker_entries, backup->'entries');
  delete from public.tracker_xp_awards where user_id = owner;
  if exists (
    select 1 from jsonb_populate_recordset(null::public.tracker_xp_awards, backup->'trackerAwards') a
    where a.kind not in ('workouts','focus','habitlogs','coding','milestones')
      or (not a.reversed and not exists (select 1 from public.tracker_entries e where e.id = a.source_id and e.user_id = owner and e.kind = a.kind))
  ) then raise exception 'Invalid tracker award reference'; end if;
  insert into public.tracker_xp_awards(id,user_id,source_id,kind,day,xp,reversed,created_at)
  select id,owner,source_id,kind,day,xp,reversed,coalesce(created_at,now())
  from jsonb_populate_recordset(null::public.tracker_xp_awards, backup->'trackerAwards');
end
$$;
revoke all on function public.export_aaronos_backup(), public.restore_aaronos_backup(jsonb) from public, anon;
grant execute on function public.export_aaronos_backup(), public.restore_aaronos_backup(jsonb) to authenticated;
