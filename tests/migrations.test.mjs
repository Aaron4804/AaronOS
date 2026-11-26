import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("migrations replay and isolate quest awards, timer writes and tracker data", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    grant usage on schema auth to authenticated, anon;
  `);
  const first = crypto.randomUUID();
  const second = crypto.randomUUID();
  await db.query("insert into auth.users values ($1), ($2)", [first, second]);
  const migrations = new URL("../supabase/migrations/", import.meta.url);
  for (const name of (await readdir(migrations)).sort()) {
    await db.exec(await readFile(new URL(name, migrations), "utf8"));
  }
  const become = async (id) => {
    await db.exec("reset role; set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  };

  await become(first);
  const quest = crypto.randomUUID();
  await db.query("insert into public.quests(id,title,xp,due_on,weekdays) values ($1,'Read',20,'2026-11-02',array[1,3])", [quest]);
  await db.query("select public.set_quest_completion($1,'2026-11-02',true)", [quest]);
  await db.query("update public.quests set xp=50 where id=$1", [quest]);
  await db.query("select public.set_quest_completion($1,'2026-11-02',true)", [quest]);
  await assert.rejects(db.query("select public.set_quest_completion($1,'2026-11-03',true)", [quest]), /outside/);
  await db.query("select public.set_quest_completion($1,'2026-11-04',true)", [quest]);
  await db.query("select public.set_quest_completion($1,'2026-11-02',false)", [quest]);
  assert.deepEqual((await db.query("select xp,reversed from public.quest_xp_awards order by day")).rows, [{ xp: 20, reversed: true }, { xp: 50, reversed: false }]);
  await assert.rejects(db.query("update public.quest_xp_awards set xp=1000"), /permission denied/);
  await assert.rejects(db.query("update public.quests set weekdays=array[4] where id=$1", [quest]), /preserve/);

  const timer = crypto.randomUUID();
  const session = crypto.randomUUID();
  await db.query("insert into public.tracker_entries(id,kind,title,day,fields) values ($1,'timer','Focus','2026-11-02',$2)", [
    timer, { target: "focus", result: session, carried: 1550, started: 0, mode: "pomodoro", focus: 25, shortBreak: 5, longBreak: 15 },
  ]);
  await db.query("select public.finish_tracker_timer($1)", [timer]);
  await db.query("select public.finish_tracker_timer($1)", [timer]);
  assert.deepEqual((await db.query("select kind,fields from public.tracker_entries")).rows, [{ kind: "focus", fields: { minutes: 25 } }]);
  assert.deepEqual((await db.query("select kind,xp,reversed from public.tracker_xp_awards")).rows, [{ kind: "focus", xp: 25, reversed: false }]);
  await db.query("insert into public.tracker_entries(kind,title,day,fields) values ('achievements','First quest completed','2026-11-02',$1),('mealtemplates','Breakfast','2026-11-02',$2)", [{code:"first-quest"},{calories:300}]);
  await assert.rejects(db.query("insert into public.tracker_entries(kind,title,day,fields) values ('achievements','Duplicate','2026-11-03',$1)", [{code:"first-quest"}]), /duplicate/i);
  const backup = (await db.query("select public.export_aaronos_backup() as backup")).rows[0].backup;
  const invalid = { ...backup, questAwards: [...backup.questAwards, backup.questAwards[0]] };
  await assert.rejects(db.query("select public.restore_aaronos_backup($1)", [invalid]), /duplicate/i);
  assert.deepEqual((await db.query("select public.export_aaronos_backup() as backup")).rows[0].backup, backup);
  await db.query("select public.restore_aaronos_backup($1)", [backup]);
  assert.deepEqual((await db.query("select public.export_aaronos_backup() as backup")).rows[0].backup, backup);

  await become(second);
  for (const table of ["quests", "quest_xp_awards", "tracker_entries", "tracker_xp_awards"]) {
    assert.equal((await db.query("select id from public." + table)).rows.length, 0);
  }
  await assert.rejects(db.query("select public.set_quest_completion($1,'2026-11-02',true)", [quest]), /unavailable/);
  await assert.rejects(db.query("select public.restore_aaronos_backup($1)", [backup]), /duplicate/i);
  const update = await db.query("update public.tracker_entries set title='Other' where id=$1 returning id", [session]);
  assert.equal(update.rows.length, 0);

  await become(first);
  await db.query("select public.set_quest_completion($1,'2026-11-04',false)",[quest]);
  assert.equal((await db.query("select id from public.tracker_entries where kind='achievements'")).rows.length,1);
  await db.query("delete from public.tracker_entries where id=$1", [session]);
  assert.deepEqual((await db.query("select reversed from public.tracker_xp_awards")).rows, [{ reversed: true }]);
});
