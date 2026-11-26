"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { trackerGroups, trackers } from "@/lib/tracker-definitions";
import { entries, putEntry, deleteEntry, finishTimer, importEntries, type Entry } from "@/lib/tracker-repository";
import { dayKey } from "@/lib/quest-stats";
import { accountBalance, cashFlow, csvCell, dailyStreak, elapsedSeconds, kilograms, liftRecords, nextBill, nutrients, parseCsv, pomodoro, scaleFood, setVolume } from "@/lib/tracker-math";
import GitHubPanel from "./github-panel";
import CalendarAgenda from "./calendar-agenda";
import TrendBars from "./trend-bars";
import BackupPanel from "./backup-panel";
import ReviewPanel, { WorkoutReview } from "./review-panel";
import ActivityHistory from "./activity-history";
import ActiveWorkout from "./active-workout";
import ModuleInsights from "./module-insights";
import ContributionCalendar from "./contribution-calendar";
import DailyBrief from "./daily-brief";
import LinkedQuests from "./linked-quests";
import { readAwards, readQuests, type QuestRecord } from "@/lib/quest-repository";
import type { Award } from "@/lib/quest-occurrences";
import { nutritionTarget, plansForDay } from "@/lib/daily-planning";
import EntryDialog from "./entry-dialog";
import { questSlot } from "@/lib/quest-occurrences";

const control = "rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2";
const button = "rounded-lg bg-zinc-800 px-3 py-2 hover:bg-zinc-700 disabled:opacity-50";
const n = (entry: Entry, key: string) => Number(entry.fields[key] || 0);
const total = (rows: Entry[], key: string) => rows.reduce((sum, row) => sum + n(row, key), 0);
const display = (value: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
const shiftDay = (day: string, delta: number) => new Date(Date.parse(day) + delta * 86_400_000).toISOString().slice(0, 10);
const habitDue = (habit: Entry, day: string) => {
  if (!day || habit.fields.state === "Archived" || habit.fields.frequency === "Weekly") return false;
  if (habit.fields.frequency !== "Selected weekdays") return true;
  const name = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][new Date(day + "T00:00:00Z").getUTCDay()];
  return String(habit.fields.weekdays || "").toLowerCase().split(",").some((weekday) => weekday.trim() === name);
};
const starterExercises = [
  ["Barbell squat", "Quadriceps", "Barbell"], ["Romanian deadlift", "Hamstrings", "Barbell"],
  ["Bench press", "Chest", "Barbell"], ["Dumbbell overhead press", "Shoulders", "Dumbbell"],
  ["Lat pulldown", "Back", "Cable"], ["Seated cable row", "Back", "Cable"],
  ["Push-up", "Chest", "Bodyweight"], ["Plank", "Core", "Bodyweight"],
] as const;

function summary(rows: Entry[], day: string, from = day, to = day) {
  const ranged = rows.filter((row) => row.day >= from && row.day <= to);
  const of = (kind: string) => ranged.filter((row) => row.kind === kind);
  const meals = of("meals");
  const sets = rows.filter((row) => row.kind === "sets" && row.fields.status !== "Planned" && of("workouts").some((workout) => workout.id === row.fields.workout));
  const latest = rows.filter((row) => row.kind === "measurements" && n(row, "weight") && row.day <= to).sort((a, b) => b.day.localeCompare(a.day))[0];
  const finances = cashFlow(of("finance").map((row) => ({ direction: String(row.fields.direction), amount: n(row, "amount") })));
  const settings = rows.find((row) => row.kind === "settings");
  const weeklyStart = new Date(Date.parse(day) - 6 * 86_400_000);
  const week = day ? weeklyStart.toISOString().slice(0, 10) : "";
  const weeklyWork = total(rows.filter((row) => row.kind === "work" && row.day >= week && row.day <= day), "minutes");
  const recentWeights = rows.filter((row) => row.kind === "measurements" && n(row, "weight") && row.day >= week && row.day <= day);
  const sleepHours = of("wellness").reduce((sum, row) => {
    const start = String(row.fields.sleep || "");
    const end = String(row.fields.wake || "");
    const duration = Date.parse(end + "Z") - Date.parse(start + "Z");
    return sum + (duration > 0 ? duration / 3_600_000 : 0);
  }, 0);
  return [
    ["Work", display(total(of("work"), "minutes") / 60) + " h"],
    ["Productive work", display((total(of("work"), "minutes") - total(of("work"), "breaks")) / 60) + " h"],
    ["Work · last 7 days", display(weeklyWork / 60) + " h"],
    ["Focus", display(total(of("focus"), "minutes")) + " min"],
    ["Workouts completed", String(of("workouts").filter((row) => row.fields.status !== "Planned").length)],
    ["Workout plans today", String(rows.filter((row) => row.kind === "plans" && (row.day === day || (n(row, "repeat") && questSlot(row.day, n(row, "repeat"), day)))).length)],
    ["Training volume", display(sets.reduce((sum, row) => sum + setVolume(n(row, "weight"), String(row.fields.unit), n(row, "reps"), String(row.fields.type).toLowerCase()), 0)) + " kg"],
    ...nutrients.map((name) => [name, display(total(meals, name)) + (from === to && settings && n(settings, name) ? " / " + display(n(settings, name)) : "")]),
    ["Latest weight", latest ? display(kilograms(n(latest, "weight"), String(latest.fields.unit))) + " kg" : "—"],
    ["Weight · 7-day mean", recentWeights.length ? display(recentWeights.reduce((sum, row) => sum + kilograms(n(row, "weight"), String(row.fields.unit)), 0) / recentWeights.length) + " kg" : "—"],
    ["Water", display(total(of("wellness"), "water")) + " ml"],
    ["Sleep logged", display(sleepHours) + " h"],
    ["Habit entries", String(of("habitlogs").length)],
    ["Coding problems solved", String(of("coding").filter((row) => row.fields.solved === "Yes").length)],
    ["Net cash flow", display(finances.net) + " " + (settings?.fields.currency || "INR")],
    ["Income", display(finances.income)],
    ["Expenses", display(finances.expenses)],
    ["Active projects", String(rows.filter((row) => row.kind === "projects" && row.fields.status === "In Progress").length)],
    ["Learning", display(total(of("learning"), "minutes")) + " min"],
  ];
}

export default function Tracker({ local, group, initialKind, selectedId, autoAdd }: { local: boolean; group: string; initialKind?: string; selectedId?: string; autoAdd?: boolean }) {
  const tabs = trackerGroups[group] ?? [];
  const [kind, setKind] = useState(initialKind && tabs.includes(initialKind) ? initialKind : tabs[0] ?? "");
  const [rows, setRows] = useState<Entry[] | null>(null);
  const [draft, setDraft] = useState<Entry | null>(null);
  const [foodSearch, setFoodSearch] = useState("");
  const [journalFavorites, setJournalFavorites] = useState(false);
  const [linked, setLinked] = useState<{ quests: QuestRecord[]; awards: Award[] }>({quests:[],awards:[]});
  useEffect(() => {
    if (!["projects","goals"].includes(kind)) return;
    let live = true;
    Promise.all([readQuests(local),readAwards(local)]).then(([quests,awards])=>{ if (live) setLinked({quests,awards}); },()=>{});
    return ()=>{ live=false; };
  },[kind,local]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [clock, setClock] = useState(0);
  const [copyFrom, setCopyFrom] = useState("");
  const [timerProject, setTimerProject] = useState("");
  const [restUntil, setRestUntil] = useState(0);
  const [kanban, setKanban] = useState(false);
  const [expandedCards, setExpandedCards] = useState(false);
  const [focusMode, setFocusMode] = useState("stopwatch");
  const definition = trackers[kind];
  const preferences = rows?.find((row) => row.kind === "settings");
  let today = "";
  if (clock) {
    try { today = dayKey(new Date(clock), String(preferences?.fields.timezone || "Asia/Kolkata")); }
    catch { today = dayKey(new Date(clock)); }
  }
  const timer = rows?.find((row) => row.kind === "timer");
  const elapsed = timer ? elapsedSeconds(n(timer, "started"), n(timer, "carried"), clock) : 0;
  const cycle = timer?.fields.mode === "pomodoro" ? pomodoro(elapsed, n(timer, "focus"), n(timer, "shortBreak"), n(timer, "longBreak")) : null;

  useEffect(() => {
    Promise.resolve().then(() => setClock(Date.now()));
    entries(local).then((loaded) => {
      setRows(loaded);
      if (selectedId && initialKind && trackerGroups[group]?.includes(initialKind)) {
        setDraft(loaded.find((row) => row.id === selectedId && row.kind === initialKind) ?? null);
      } else if (autoAdd && initialKind && trackerGroups[group]?.includes(initialKind)) {
        let day = dayKey(new Date());
        try { day = dayKey(new Date(), String(loaded.find((row) => row.kind === "settings")?.fields.timezone || "Asia/Kolkata")); } catch {}
        setDraft({ id: crypto.randomUUID(), kind: initialKind, title: "", day, fields: initialKind === "finance" ? { direction: "Expense" } : {} });
      }
    }, (cause: Error) => setError(cause.message));
    const interval = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [local, group, initialKind, selectedId, autoAdd]);

  async function mutate(operation: () => Promise<void>) {
    setBusy(true);
    setError("");
    try { await operation(); setRows(await entries(local)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save."); }
    finally { setBusy(false); }
  }

  function make(type: string, title = ""): Entry {
    return { id: crypto.randomUUID(), kind: type, title, day: date || today, fields: {} };
  }

  function exportRows() {
    download("aaronos-trackers.json", JSON.stringify(rows?.filter((row) => row.kind !== "timer"), null, 2), "application/json");
  }

  function download(name: string, content: string, type: string) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (!rows) return error ? <p role="alert">{error}</p> : <p role="status">Loading records…</p>;
  if (group === "coach") return <section className="space-y-4">
    <h1 className="text-2xl font-semibold">Personal coach</h1>
    <p className="text-zinc-400">Rule-based review derived from your saved records. No external AI service is used.</p>
    <ReviewPanel rows={rows} today={today} />
    {today && <section className="space-y-2 rounded-xl border border-zinc-800 p-4"><h2 className="font-semibold">What needs attention</h2>
      {(() => {
        const cutoff = shiftDay(today, 7);
        const upcoming = rows.filter((row) => ["goals", "projects"].includes(row.kind) && row.fields.deadline && String(row.fields.deadline) <= cutoff && !["Completed", "Archived"].includes(String(row.fields.status)));
        const dueHabits = rows.filter((row) => row.kind === "habits" && habitDue(row, today) &&
          total(rows.filter((entry) => entry.kind === "habitlogs" && entry.fields.habit === row.id && entry.day === today), "amount") < (n(row, "target") || 1));
        return upcoming.length || dueHabits.length ? <ul className="divide-y divide-zinc-800">{upcoming.map((row) => <li className="flex flex-wrap justify-between gap-2 py-2" key={row.id}><span>{row.title} · {String(row.fields.deadline) < today ? "Overdue" : "Due " + row.fields.deadline}</span><Link className="text-emerald-300" href={row.kind==="projects"?"/dashboard/work?kind=projects&record="+row.id:"/dashboard/personal?kind=goals&record="+row.id}>Review {row.kind==="projects"?"project":"goal"}</Link></li>)}
          {dueHabits.map((row) => <li className="flex flex-wrap justify-between gap-2 py-2" key={row.id}><span>{row.title} · Habit target still open today</span><Link className="text-emerald-300" href="/dashboard/wellness?kind=habits">Open habits</Link></li>)}</ul> : <p className="text-zinc-400">No upcoming deadlines or open daily habits found.</p>;
      })()}
    </section>}
  </section>;
  const cards = summary(rows, today, from || today, to || today);
  const primary = ["Work", "Workouts completed", "calories", "protein", "Latest weight", "Water", "Habit entries", "Net cash flow"];
  const orderedCards = [...primary.flatMap((label) => cards.filter(([name]) => name === label)), ...cards.filter(([name]) => !primary.includes(name))];
  const order = String(preferences?.fields.widgets || "").split(",").map((label) => label.trim().toLowerCase()).filter(Boolean);
  const hidden = new Set(String(preferences?.fields.hiddenModules || "").toLowerCase().split(",").map((value) => value.trim()));
  const displayed = group === "overview" && order.length ? [...new Set(order)].flatMap((label) => cards.filter(([name]) => name.toLowerCase() === label)) : orderedCards;
  const visibleCards = group === "overview" && !expandedCards ? displayed.slice(0, 8) : displayed;
  if (group === "overview" || group === "analytics") return <section className="space-y-4">
    {group === "overview" && preferences?.fields.name && <p className="font-semibold">Hello, {preferences.fields.name}</p>}
    {group === "overview" && <DailyBrief rows={rows} today={today} busy={busy} checkIn={(habit,amount)=>void mutate(()=>putEntry(local,{...make("habitlogs",habit.title),day:today,fields:{habit:habit.id,amount}}))} />}
    {group === "overview" ? <nav aria-label="Trackers" className="flex flex-wrap gap-2">{[...Object.keys(trackerGroups), "analytics", "coach"].filter((name) => name === "settings" || !hidden.has(name)).map((name) => <Link className={button + " capitalize"} key={name} href={"/dashboard/" + name}>{name}</Link>)}</nav> :
      <div className="flex flex-wrap items-end gap-2"><label>From <input className={control} type="date" value={from || today} onChange={(event) => setFrom(event.target.value)} /></label><label>To <input className={control} type="date" value={to || today} onChange={(event) => setTo(event.target.value)} /></label><button className={button} onClick={exportRows}>Export tracker JSON</button></div>}
    {today && <div className="flex flex-wrap gap-2" aria-label="Date presets">
      {[["Today", today, today], ["Yesterday", shiftDay(today, -1), shiftDay(today, -1)], ["Last 7 days", shiftDay(today, -6), today], ["Last 30 days", shiftDay(today, -29), today], ["This month", today.slice(0, 7) + "-01", today]].map(([label, start, end]) => <button className={button} key={label} onClick={() => { setFrom(start); setTo(end); }}>{label}</button>)}
    </div>}
    {from && to && from > to ? <p role="alert">Choose an end date on or after the start date.</p> : <section className="os-panel">
      <h2 className="mb-3 font-semibold">{group === "overview" ? "Daily overview" : "Period totals"}</h2>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">{visibleCards.map(([label, value]) => <div className="border-t border-zinc-700 pt-2" key={label}><dt className="text-xs text-zinc-400">{label}</dt><dd className="text-lg font-semibold">{value}</dd></div>)}</dl>
    </section>}
    {group === "overview" && displayed.length > 8 && <button className={button} onClick={() => setExpandedCards(!expandedCards)}>{expandedCards ? "Show fewer metrics" : "Show all metrics"}</button>}
    <ul className="space-y-1">{rows.filter((row) => ["events", "projects"].includes(row.kind) && String(row.fields.deadline || row.day) >= today).sort((a, b) => String(a.fields.deadline || a.day).localeCompare(String(b.fields.deadline || b.day))).slice(0, 5).map((row) => <li key={row.id} className="text-sm">{String(row.fields.deadline || row.day)} · {row.title}</li>)}</ul>
    {group === "overview" && today && preferences?.fields.reminders !== "No" && <details id="reminders" className="os-panel">
      <summary>In-app reminders</summary>
      {(() => {
        const quiet = preferences?.fields.remindersSnoozed === today;
        const setQuiet = (day:string) => void mutate(() => putEntry(local,{ ...(preferences ?? {...make("settings","Preferences"),day:today}),fields:{...preferences?.fields,remindersSnoozed:day} }));
        if (quiet) return <div className="mt-3"><p>Reminders are hidden for today.</p><button className={button} disabled={busy} onClick={()=>setQuiet("")}>Show reminders again</button></div>;
        const deadline = shiftDay(today, 7);
        const reminders = rows.filter((row) => {
          if (row.kind === "projects" && ["Completed", "Archived"].includes(String(row.fields.status))) return false;
          if (row.kind === "projects" || row.kind === "goals") return preferences?.fields.reminderDeadlines !== "No" && row.fields.deadline && String(row.fields.deadline) <= deadline;
          if (row.kind === "events") return row.day >= today && row.day <= deadline;
          if (row.kind === "subscriptions") return preferences?.fields.reminderBills !== "No" && row.day <= deadline;
          if (row.kind === "habits" && preferences?.fields.reminderHabits !== "No" && habitDue(row, today)) return total(rows.filter((record) => record.kind === "habitlogs" && record.fields.habit === row.id && record.day === today), "amount") < (n(row, "target") || 1);
          return false;
        });
        return reminders.length ? <div className="mt-2 space-y-2"><ul className="space-y-1">{reminders.map((row) => <li key={row.id}>{row.kind === "habits" ? "Habit remaining today" : String(row.fields.deadline || row.day)} · {row.title}</li>)}</ul><button className={button} disabled={busy} onClick={()=>setQuiet(today)}>Hide reminders for today</button></div> : <p>No upcoming reminders from your saved records.</p>;
      })()}
    </details>}
    {group === "analytics" && <ActivityHistory local={local} rows={rows} from={from || today} to={to || today} />}
    {group === "analytics" && <><ReviewPanel rows={rows} today={today} /><TrendBars entries={rows} from={from || today} to={to || today} /></>}
    {today && (() => {
      const recentWork = rows.filter((row) => row.kind === "work" && row.day >= shiftDay(today, -6) && row.day <= today);
      const proteinLogs = rows.filter((row) => row.kind === "meals" && row.day === today);
      const due = rows.filter((row) => row.kind === "projects" && !["Completed", "Archived"].includes(String(row.fields.status)) && row.fields.deadline && String(row.fields.deadline) < today);
      if (!recentWork.length && !proteinLogs.length && !due.length) return null;
      return <section className="rounded-xl border border-zinc-800 p-4"><h2 className="font-semibold">Rule-based insights</h2><ul className="list-inside list-disc text-sm">
        {recentWork.length > 0 && preferences && n(preferences, "work") > 0 && <li>{display(total(recentWork, "minutes"))} of {display(n(preferences, "work"))} work minutes logged in the last seven days.</li>}
        {proteinLogs.length > 0 && <li>{display(total(proteinLogs, "protein"))} g protein logged today{preferences && n(preferences, "protein") > 0 ? " against a " + display(n(preferences, "protein")) + " g target" : ""}.</li>}
        {due.length > 0 && <li>{due.length} open project deadline{due.length === 1 ? "" : "s"} passed.</li>}
      </ul></section>;
    })()}
  </section>;

  const visible = rows.filter((row) => row.kind === kind && (kind !== "journal" || !journalFavorites || row.fields.favorite === "Yes") && (!date || row.day === date) && [row.title, ...Object.values(row.fields)].some((value) => String(value).toLowerCase().includes(search.toLowerCase()))).sort((a, b) => b.day.localeCompare(a.day));
  const setRowsByExercise = rows.filter((row) => row.kind === "sets" && rows.some((workout) => workout.kind === "workouts" && workout.id === row.fields.workout));
  const daily = rows.filter((row) => row.day === (date || today));
  const mealNames = [...new Set(["Breakfast", "Lunch", "Dinner", "Snacks", ...daily.filter((row) => row.kind === "meals").map((row) => String(row.fields.meal || "Uncategorized"))])];
  const mealRows = daily.filter((row) => row.kind === "meals");
  function ingredientTotals(recipe: Entry) {
    const sources = rows!.filter((row) => row.kind === "ingredients" && row.fields.recipe === recipe.id);
    const calculated = sources.map((ingredient) => {
      const food = rows!.find((row) => row.kind === "foods" && row.id === ingredient.fields.food);
      return food && n(ingredient, "quantity") > 0 ? scaleFood(food.fields, n(ingredient, "quantity")) : null;
    });
    if (!sources.length || calculated.some((row) => row === null)) return null;
    return Object.fromEntries(nutrients.map((key) => [key, calculated.reduce((sum, row) => sum + (row?.[key] ?? 0), 0)]));
  }

  return <div className="min-w-0">
  <section className="min-w-0 space-y-4">
    <h1 className="os-title">{kind === "meals" ? "Food diary" : kind === "work" ? "Work dashboard" : definition.title}</h1>
    <ModuleInsights kind={kind} rows={rows} today={today} open={setDraft} />
    {kind === "coding" && <ContributionCalendar username={String(preferences?.fields.github || "Aaron4804")} />}
    {!["events","journal","goals"].includes(initialKind || "") && <nav aria-label="Tracker sections" className="flex gap-1 overflow-x-auto border-b border-zinc-800">{tabs.map((tab) => <button key={tab} className={"shrink-0 border-b-2 px-3 py-2 text-sm " + (kind === tab ? "border-emerald-400 text-emerald-300" : "border-transparent text-zinc-400 hover:text-white")} aria-pressed={kind === tab} onClick={() => { setKind(tab); setDraft(null); setSearch(""); setDate(""); }}>{({ meals:"Diary", foods:"Food library", diets:"Diet plans", workouts:"Overview", records:"Personal records" } as Record<string,string>)[tab] ?? trackers[tab].title}</button>)}</nav>}
    {local && <p className="text-sm text-amber-300">Local development · browser data</p>}
    {group === "coding" && <GitHubPanel key={String(preferences?.fields.github || "Aaron4804")} username={String(preferences?.fields.github || "Aaron4804")} leetcode={String(preferences?.fields.leetcode || "")} />}
    {kind === "events" && <CalendarAgenda local={local} today={today} rows={rows} onEdit={(row) => { setKind(row.kind); setDraft(row); }} onNew={(day) => setDraft({ ...make("events"), day })} />}
    {kind === "workouts" && !timer && <section className="os-hero space-y-2">
      <p className="text-xs uppercase tracking-widest text-emerald-300">Today’s training</p>
      {(() => {
        const plan = plansForDay(rows,today)[0];
        const weekly = rows.filter((row) => row.kind === "workouts" && row.fields.status !== "Planned" && today && row.day >= shiftDay(today, -6) && row.day <= today).length;
        return <><h2 className="text-xl font-semibold">{plan?.title ?? "Open training day"}</h2><p>{plan?.fields.split ? String(plan.fields.split) + " · " : ""}{weekly} completed workouts in the last seven days</p>
          <button className="rounded-lg bg-emerald-400 px-4 py-2 font-semibold text-emerald-950" disabled={busy || !today} onClick={() => void mutate(async () => {
            const workout = { ...make("workouts", plan?.title ?? "Workout"), day: today, fields: { status: "Planned", ...(plan ? { plan: plan.id } : {}) } };
            const sets = plan ? rows.filter((set) => set.kind === "templates" && set.fields.plan === plan.id).map((set) => ({ ...make("sets", set.title), day: today, fields: { ...set.fields, workout: workout.id, status: "Planned" } })) : [];
            await importEntries(local, [workout, ...sets]);
            await putEntry(local, { ...make("timer", workout.title), day: today, fields: { target: "workouts", result: workout.id, started: Date.now(), carried: 0 } });
          })}>Start workout</button></>;
      })()}
    </section>}
    {["work", "meals", "measurements", "learning"].includes(kind) && <details><summary>Period review</summary><ReviewPanel rows={rows} today={today} /></details>}
    {kind === "settings" && <BackupPanel local={local} />}
    {kind === "settings" && <section className="os-panel space-y-2"><h2 className="font-semibold">Install AaronOS</h2><p className="text-sm text-zinc-400">On iPhone, open the secure production URL in Safari and choose Share → Add to Home Screen. On desktop use your browser’s Install menu. Your workspace requires an internet connection.</p></section>}
    {kind === "measurements" && today && <section className="os-panel space-y-3"><h2 className="text-lg font-semibold">Body progress</h2><TrendBars entries={rows} only="measurements" from={shiftDay(today,-29)} to={today} /></section>}
    {kind === "habits" && today && <section className="os-panel space-y-3">
      <h2 className="text-lg font-semibold">Habit check-in</h2>
      {rows.filter((row) => row.kind === "habits" && row.fields.state !== "Archived").map((habit) => {
        const logs = rows.filter((row) => row.kind === "habitlogs" && row.fields.habit === habit.id);
        const target = n(habit,"target") || 1;
        const done = total(logs.filter((row)=>row.day===today),"amount") >= target;
        return <div key={habit.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-700 pt-3">
          <span>{habit.title}</span><div aria-label="Last seven days" className="flex gap-1">{Array.from({length:7},(_,i)=>shiftDay(today,i-6)).map((day) => {
            const met = total(logs.filter((row)=>row.day===day),"amount") >= target;
            return <span key={day} title={day + (met ? " complete" : " incomplete")} className={"size-4 rounded " + (met?"bg-emerald-400":"bg-zinc-700")} />;
          })}</div>
          <button className={button} disabled={done || busy} onClick={() => void mutate(() => putEntry(local,{...make("habitlogs",habit.title),day:today,fields:{habit:habit.id,amount:Math.max(0,target-total(logs.filter((row)=>row.day===today),"amount"))}}))}>{done ? "Done today" : "Check in"}</button>
        </div>;
      })}
      {!rows.some((row) => row.kind === "habits" && row.fields.state !== "Archived") && <p className="text-sm text-zinc-400">Create a habit to start tracking your week.</p>}
    </section>}
    {kind === "work" && today && <section className="os-panel grid gap-4 sm:grid-cols-3">
      <div><h2 className="text-sm text-zinc-400">Logged today</h2><p className="text-2xl font-semibold">{display(total(daily.filter((row) => row.kind === "work"), "minutes") / 60)} h</p></div>
      {(() => {
        const minutes = total(rows.filter((row) => row.kind === "work" && row.day >= shiftDay(today, -6) && row.day <= today), "minutes");
        const target = preferences ? n(preferences, "work") : 0;
        return <div><h2 className="text-sm text-zinc-400">Last seven days</h2><p className="text-2xl font-semibold">{display(minutes / 60)}{target ? " / " + display(target / 60) : ""} h</p>{target > 0 && <progress className="w-full accent-emerald-400" aria-label="Weekly work target" max={target} value={Math.min(minutes, target)} />}</div>;
      })()}
      <div><h2 className="text-sm text-zinc-400">Active projects</h2>{rows.filter((row) => row.kind === "projects" && row.fields.status === "In Progress").slice(0, 3).map((row) => <Link className="block text-emerald-300" key={row.id} href={"/dashboard/work?kind=projects&record=" + row.id}>{row.title}</Link>)}<Link className="text-sm text-emerald-300" href="/dashboard/work?kind=projects">Open projects</Link></div>
    </section>}
    {kind === "settings" && <div className="flex flex-wrap items-center gap-3">
      <button className={button} onClick={exportRows}>Export tracker records</button>
      <label className="grid gap-1">Import missing tracker records<input className={control} type="file" accept=".json,application/json" disabled={busy} onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file || !confirm("Import records from this backup? Existing records will be kept.")) return;
        void mutate(async () => {
          if (file.size > 10_000_000) throw new Error("Backup exceeds 10 MB.");
          await importEntries(local, JSON.parse(await file.text()));
        });
      }} /></label>
    </div>}
    {kind === "meals" && <section className="rounded-xl border border-zinc-800 p-3" aria-label="Meal breakdown">
      <h2 className="font-semibold">Meal breakdown · {date || today}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{["calories", "protein", "carbs", "fat"].map((key) => {
        const consumed = total(mealRows, key);
        const target = nutritionTarget(preferences, key, plansForDay(rows,date || today).length > 0 || daily.some((row)=>row.kind==="workouts" && row.fields.status!=="Planned"));
        return <div key={key} className="os-panel"><h3 className="capitalize text-zinc-400">{key}</h3><p className="text-xl font-semibold">{display(consumed)}{target ? " / " + display(target) : ""}</p>{target > 0 && <><progress className="w-full accent-emerald-400" aria-label={key + " target"} max={target} value={Math.min(consumed, target)} /><p className="text-xs">{display(target-consumed)} remaining</p></>}</div>;
      })}</div>
      <p className="text-sm text-zinc-400">Water · {display(total(daily.filter((row) => row.kind === "wellness"), "water"))} ml</p>
      {mealRows.length > 0 && <button className={button} disabled={busy} onClick={() => { setKind("mealtemplates");setDraft({ ...make("mealtemplates", "Daily meal"), fields: Object.fromEntries(nutrients.map((key) => [key,total(mealRows,key)])) }); }}>Save day as meal template</button>}
      {mealNames.length ? <ul>{mealNames.map((meal) => {
        const logs = daily.filter((row) => row.kind === "meals" && String(row.fields.meal || "Uncategorized") === meal);
        return <li key={meal} className="os-panel my-2"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{meal}</h3><button className={button} onClick={() => setDraft({ ...make("meals"), fields: { meal } })}>Add food to {meal}</button></div><p className="text-sm text-zinc-400">{display(total(logs, "calories"))} kcal · {display(total(logs, "protein"))} g protein · {display(total(logs, "carbs"))} g carbs · {display(total(logs, "fat"))} g fat</p>{logs.map((log) => <button className="mr-3 mt-2 text-emerald-300" key={log.id} onClick={() => setDraft(log)}>{log.title}</button>)}</li>;
      })}</ul> : <p className="text-zinc-400">No meals on this date.</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label>Copy meal entries from <input className={control} type="date" value={copyFrom} onChange={(event) => setCopyFrom(event.target.value)} /></label>
        <button className={button} disabled={busy || !copyFrom || !today || copyFrom === (date || today)} onClick={() => void mutate(async () => {
          const source = rows.filter((row) => row.kind === "meals" && row.day === copyFrom);
          if (!source.length) throw new Error("No meal entries on the source date.");
          if (!confirm("Copy entries to " + (date || today) + "? Existing entries will be kept.")) return;
          await importEntries(local, source.map((row) => ({ ...row, id: crypto.randomUUID(), day: date || today })));
        })}>Copy to {date || today}</button>
      </div>
    </section>}
    {kind === "diets" && <section className="rounded-xl border border-zinc-800 p-3">
      <h2 className="font-semibold">Planned vs. logged · {date || today}</h2>
      <p>{["calories", "protein", "carbs", "fat"].map((key) => key + " " + display(total(daily.filter((row) => row.kind === "diets"), key)) + " planned / " + display(total(mealRows, key)) + " logged").join(" · ")}</p>
    </section>}
    {kind === "finance" && (() => {
      const month = (date || today).slice(0, 7);
      const amounts = cashFlow(rows.filter((row) => row.kind === "finance" && row.day.startsWith(month)).map((row) => ({ direction: String(row.fields.direction), amount: n(row, "amount") })));
      const buckets = new Map<string,number>();
      for(const row of rows.filter((row)=>row.kind==="finance" && row.day.startsWith(month) && row.fields.direction==="Expense")) {
        const category = String(row.fields.category || "Uncategorized");
        buckets.set(category,(buckets.get(category)??0)+n(row,"amount"));
      }
      return <section className="os-panel space-y-3"><h2 className="font-semibold">Cash flow · {month} · {preferences?.fields.currency || "INR"}</h2><dl className="grid grid-cols-3 gap-2">{[["Income",amounts.income],["Expenses",amounts.expenses],["Net",amounts.net]].map(([label,value])=><div key={label}><dt className="text-sm text-zinc-400">{label}</dt><dd className="text-xl font-semibold">{display(Number(value))}</dd></div>)}</dl>
        {[...buckets].sort((a,b)=>b[1]-a[1]).map(([label,amount])=><div key={label} className="grid grid-cols-[minmax(0,1fr)_2fr_auto] items-center gap-2 text-sm"><span className="truncate">{label}</span><meter className="w-full" aria-label={label+" spending"} min={0} max={Math.max(1,amounts.expenses)} value={amount}/><span>{display(amount)}</span></div>)}
      </section>;
    })()}
    {kind === "exercises" && !rows.some((row) => row.kind === "exercises") && <button className={button} disabled={busy || !today} onClick={() => void mutate(() => importEntries(local, starterExercises.map(([title, muscle, equipment], index) => ({
      ...make("exercises", title),
      id: "e917be45-0804-4000-8000-" + String(index + 1).padStart(12, "0"),
      fields: { muscle, equipment },
    })).map((row) => local ? row : { ...row, id: crypto.randomUUID() })))}>Add example exercises</button>}
    {error && <p role="alert" className="text-red-300">{error}</p>}
    {(["work", "focus"].includes(kind) || (kind === "workouts" && timer)) && <div className="os-hero flex flex-wrap items-center gap-3">
      <h2 className="w-full font-semibold">{kind === "workouts" ? "Workout session" : "Session timer"}</h2>
      {timer ? <><span>{timer.title} · {Math.floor(elapsed / 60)}m {elapsed % 60}s</span>
        {cycle && <span>{cycle.phase} · {Math.floor(cycle.remaining / 60)}m {cycle.remaining % 60}s remaining</span>}
        <button className={button} disabled={busy} onClick={() => void mutate(() => {
          const now = Date.now();
          return putEntry(local, { ...timer, fields: { ...timer.fields, started: n(timer, "started") ? 0 : now, carried: elapsedSeconds(n(timer, "started"), n(timer, "carried"), now) } });
        })}>{n(timer, "started") ? "Pause" : "Resume"}</button>
        <button className={button} disabled={busy} onClick={() => void mutate(() => finishTimer(local, timer, elapsedSeconds(n(timer, "started"), n(timer, "carried"), Date.now())))}>Finish and save</button></> :
        <>
          {["work", "focus"].includes(kind) && <label>Project <select className={control} value={timerProject} onChange={(event) => setTimerProject(event.target.value)}><option value="">None</option>{rows.filter((row) => row.kind === "projects").map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}</select></label>}
          {kind === "focus" && <label>Mode <select className={control} value={focusMode} onChange={(event) => setFocusMode(event.target.value)}><option value="stopwatch">Stopwatch</option><option value="pomodoro">Pomodoro</option></select></label>}
          <button className={button} disabled={busy || !today} onClick={() => void mutate(() => putEntry(local, {
            ...make("timer", "Active " + (kind === "workouts" ? "workout" : kind)),
            fields: {
              target: kind, started: Date.now(), carried: 0, result: crypto.randomUUID(),
              ...(kind !== "workouts" && timerProject ? { project: timerProject } : {}),
              ...(kind === "focus" && focusMode === "pomodoro" ? {
                mode: "pomodoro", focus: preferences ? n(preferences, "focus") || 25 : 25,
                shortBreak: preferences ? n(preferences, "shortBreak") || 5 : 5,
                longBreak: preferences ? n(preferences, "longBreak") || 15 : 15,
              } : {}),
            },
          }))}>Start timer</button>
        </>}
    </div>}
    {kind === "workouts" && timer?.fields.target === "workouts" && (() => {
      const workout = rows.find((row) => row.kind === "workouts" && row.id === timer.fields.result);
      return workout && <ActiveWorkout workout={workout} rows={rows} busy={busy} make={() => make("sets", "Set")} save={(row) => mutate(() => putEntry(local, row))} />;
    })()}
    {kind === "workouts" && !timer && <WorkoutReview rows={rows} today={today} />}
    {kind === "sets" && restUntil > 0 && <p role="status">Rest {Math.max(0, Math.ceil((restUntil - clock) / 1000))} seconds remaining <button className={button} onClick={() => setRestUntil(0)}>Dismiss</button></p>}
    {kind === "sets" && <details className="rounded-xl border border-zinc-800 p-3"><summary>Exercise history and personal records</summary><ul className="mt-3 space-y-2">
      {rows.filter((row) => row.kind === "exercises").map((exercise) => {
        const sets = setRowsByExercise.filter((row) => row.fields.exercise === exercise.id && row.fields.status !== "Planned");
        const best = liftRecords(sets.map((row) => ({ weight: n(row, "weight"), unit: String(row.fields.unit), reps: n(row, "reps"), type: String(row.fields.type).toLowerCase() })));
        return <li key={exercise.id}>{exercise.title} · {sets.length} sets · {display(best.heaviest)} kg best lift · {display(best.estimatedMax)} kg estimated 1RM · {display(best.setVolume)} kg best set volume</li>;
      })}
    </ul></details>}
    <div className="flex flex-wrap gap-2">
      <button className={button} disabled={busy || !today} onClick={() => setDraft(kind === "settings" && preferences ? preferences : make(kind, kind === "settings" ? "Preferences" : ""))}>{({settings:"Edit preferences", meals:"Log a meal", foods:"Add food", measurements:"Log weight", work:"Log work session", projects:"Add project", finance:"Add transaction", journal:"Write entry", habits:"Create habit", events:"Add event", exercises:"Add exercise", plans:"Create plan", workouts:"Log workout"} as Record<string,string>)[kind] ?? "New " + definition.title.replace(/s$/, "").toLowerCase()}</button>
      {kind === "projects" && <button className={button} onClick={() => setKanban(!kanban)}>{kanban ? "List view" : "Kanban view"}</button>}
      <input className={control} aria-label="Search records" placeholder="Search records" value={search} onChange={(event) => setSearch(event.target.value)} />
      {kind === "journal" && <button className={button} aria-pressed={journalFavorites} onClick={() => setJournalFavorites(!journalFavorites)}>{journalFavorites ? "Show all entries" : "Show favorites"}</button>}
      <input className={control} aria-label="Filter by date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      {["work", "finance"].includes(kind) && <button className={button} onClick={() => {
        const keys = definition.fields.map((field) => field.key);
        const csv = [["Date", "Title", ...definition.fields.map((field) => field.label)], ...visible.map((row) => [row.day, row.title, ...keys.map((key) => row.fields[key] ?? "")])].map((line) => line.map(csvCell).join(",")).join("\r\n");
        download("aaronos-" + kind + ".csv", csv, "text/csv");
      }}>Export visible CSV</button>}
      {kind === "finance" && <label className="grid gap-1">Import AaronOS finance CSV<input className={control} type="file" accept=".csv,text/csv" disabled={busy} onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file || !confirm("Import unique transactions from this CSV?")) return;
        void mutate(async () => {
          if (file.size > 2_000_000) throw new Error("CSV exceeds 2 MB.");
          const [header, ...lines] = parseCsv(await file.text());
          const expected = ["Date", "Title", ...definition.fields.map((field) => field.label)];
          if (header?.length !== expected.length || expected.some((label, index) => label !== header[index])) throw new Error("Use the finance CSV export column format.");
          const key = (row: Entry) => JSON.stringify([row.day, row.title, ...definition.fields.map((field) => String(row.fields[field.key] ?? ""))]);
          const seen = new Set(rows.filter((row) => row.kind === "finance").map(key));
          const incoming = lines.flatMap((line) => {
            if (line.length !== expected.length) throw new Error("Every CSV row must have the same number of columns as the header.");
            const [day, title, ...values] = line;
            const fields = Object.fromEntries(definition.fields.map((field, index) => [field.key, field.type === "number" && values[index] !== "" ? Number(values[index]) : values[index]]));
            const row = { ...make("finance", title), day, fields };
            const identity = key(row);
            if (seen.has(identity)) return [];
            seen.add(identity);
            return [row];
          });
          await importEntries(local, incoming);
        });
      }} /></label>}
    </div>
    {draft && (() => {
      const form = <form className="grid gap-3 rounded-xl border border-zinc-800 p-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void mutate(async () => { await putEntry(local, draft); setDraft(null); }); }}>
      <label className="grid gap-1">Title<input className={control} required maxLength={200} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
      <label className="grid gap-1">Date<input className={control} type="date" required value={draft.day} onChange={(event) => setDraft({ ...draft, day: event.target.value })} /></label>
      {definition.fields.map((field) => {
        const value = draft.fields[field.key] ?? "";
        const change = (value: string) => {
          const fields = { ...draft.fields, [field.key]: field.type === "number" && value !== "" ? Number(value) : value };
          if (["meals", "diets"].includes(kind) && ["food", "quantity"].includes(field.key) && !rows.some((row) => row.id === draft.id)) {
            const food = rows.find((row) => row.kind === "foods" && row.id === fields.food);
            if (food && Number(fields.quantity) > 0 && n(food, "serving") > 0) {
              setDraft({ ...draft, title: draft.title || food.title, fields: { ...fields, ...scaleFood(food.fields, Number(fields.quantity)), unit: food.fields.unit || "" } });
              return;
            }
          }
          setDraft({ ...draft, fields });
        };
        if (kind === "meals" && field.key === "food") {
          const recent = new Set(rows.filter((row) => row.kind === "meals" && row.fields.food).sort((a,b)=>b.day.localeCompare(a.day)).slice(0,12).map((row)=>row.fields.food));
          const foods = rows.filter((row) => row.kind === "foods" && (row.id === value || row.title.toLowerCase().includes(foodSearch.trim().toLowerCase())))
            .sort((a,b)=>Number(b.fields.favorite === "Yes")-Number(a.fields.favorite === "Yes") || Number(recent.has(b.id))-Number(recent.has(a.id)) || a.title.localeCompare(b.title));
          return <div className="os-panel space-y-2" key={field.key}><label className="grid gap-1">Find food<input className={control} value={foodSearch} onChange={(event) => setFoodSearch(event.target.value)} placeholder="Search food library" /></label>
            <label className="grid gap-1">{field.label}<select className={control} value={value} onChange={(event) => change(event.target.value)}><option value="">Manual entry</option>{foods.map((food) => <option value={food.id} key={food.id}>{food.title}{food.fields.favorite === "Yes" ? " · Favorite" : recent.has(food.id) ? " · Recent" : ""}</option>)}</select></label>
            <Link href="/dashboard/nutrition?kind=foods&add=1" className="text-sm text-emerald-300">Create a library food</Link>
          </div>;
        }
        if (kind === "settings" && field.key === "hiddenModules") {
          const hiddenNames = String(value).split(",").map((name) => name.trim()).filter(Boolean);
          return <fieldset className="space-y-1" key={field.key}><legend>Modules to hide from navigation</legend>
            {[...Object.keys(trackerGroups).filter((name) => name !== "settings"), "analytics", "coach"].map((name) => <label key={name} className="flex items-center gap-2 capitalize">
              <input type="checkbox" checked={hiddenNames.includes(name)} onChange={(event) => change((event.target.checked ? [...hiddenNames, name] : hiddenNames.filter((item) => item !== name)).join(", "))} />{name}
            </label>)}
          </fieldset>;
        }
        if (kind === "settings" && field.key === "widgets") {
          const labels = orderedCards.map(([label]) => label);
          const chosen = String(value).split(",").map((label) => label.trim()).filter(Boolean);
          const selected = chosen.length ? chosen : labels;
          function move(label: string, delta: number) {
            const index = selected.indexOf(label);
            const target = index + delta;
            if (index < 0 || target < 0 || target >= selected.length) return;
            const next = [...selected];
            [next[index], next[target]] = [next[target], next[index]];
            change(next.join(", "));
          }
          return <fieldset className="space-y-1" key={field.key}><legend>Dashboard cards and order</legend>
            {[...selected, ...labels.filter((label) => !selected.includes(label))].map((label, index) => <div className="flex flex-wrap items-center gap-1" key={label}>
              <label className="mr-auto flex items-center gap-1"><input type="checkbox" checked={selected.includes(label)} disabled={selected.length === 1 && selected.includes(label)} onChange={(event) => change((event.target.checked ? [...selected, label] : selected.filter((item) => item !== label)).join(", "))} />{label}</label>
              {selected.includes(label) && <><button type="button" className={button} aria-label={"Move " + label + " up"} disabled={index === 0} onClick={() => move(label, -1)}>↑</button><button type="button" className={button} aria-label={"Move " + label + " down"} disabled={index === selected.length - 1} onClick={() => move(label, 1)}>↓</button></>}
            </div>)}
          </fieldset>;
        }
        const heading = kind === "settings" ? ({timezone:"Account and locale",github:"Integrations",water:"Daily targets",xpPerLevel:"XP and progression",training_calories:"Training-day nutrition",rest_calories:"Rest-day nutrition",shortBreak:"Timer preferences",name:"Appearance and navigation",reminderHabits:"Notifications",reward_workouts:"XP rewards"} as Record<string,string>)[field.key] : undefined;
        return <div className={kind==="journal" && field.key==="text" ? "sm:col-span-2" : "contents"} key={field.key}>{heading && <h3 className="mt-3 border-t border-zinc-700 pt-3 font-semibold text-emerald-300 sm:col-span-2">{heading}</h3>}<label className="grid gap-1">{field.label}
          {field.options || field.relation ? <select className={control} required={field.required} value={value} onChange={(event) => change(event.target.value)}><option value="">Select</option>{field.options?.map((option) => <option key={option}>{option}</option>)}{rows.filter((row) => row.kind === field.relation).map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}</select> :
            field.type === "textarea" ? <textarea aria-label={field.label} rows={kind==="journal" && field.key==="text"?10:3} className={control} required={field.required} value={value} onChange={(event) => change(event.target.value)} /> :
              <input className={control} required={field.required} type={field.type ?? "text"} inputMode={field.type === "number" ? "decimal" : undefined} min={field.min} step={field.type === "number" ? "any" : undefined} value={value} onChange={(event) => change(event.target.value)} />}
        </label></div>;
      })}
      {["projects","goals"].includes(kind) && <LinkedQuests local={local} value={String(draft.fields.questIds||"")} onChange={(questIds)=>setDraft({...draft,fields:{...draft.fields,questIds}})} />}
      {["meals", "diets"].includes(kind) && <button className={button} type="button" onClick={() => {
        try {
          const food = rows.find((row) => row.kind === "foods" && row.id === draft.fields.food);
          if (!food) throw new Error("Select a food first.");
          const values = scaleFood(food.fields, n(draft, "quantity"));
          setDraft({ ...draft, title: draft.title || food.title, fields: { ...draft.fields, ...values, unit: food.fields.unit || "" } });
          setError("");
        } catch (cause) { setError((cause as Error).message); }
      }}>Copy calculated nutrients from food</button>}
      <div className="flex gap-2"><button className={button + " text-green-400"} disabled={busy}>Save</button><button className={button} type="button" onClick={() => setDraft(null)}>Cancel</button></div>
      </form>;
      return ["meals","mealtemplates","events","journal","measurements"].includes(draft.kind) ? <EntryDialog title={draft.kind === "meals" ? draft.fields.meal ? "Food · " + draft.fields.meal : "Log food" : draft.kind === "mealtemplates" ? "Save meal template" : draft.kind === "events" ? "Calendar event" : draft.kind === "journal" ? "Journal entry" : "Log measurement"} onClose={() => setDraft(null)}>{error && <p role="alert" className="mb-3 text-red-300">{error}</p>}{form}</EntryDialog> : form;
    })()}
    {!visible.length && <p className="text-zinc-400">No matching records.</p>}
    {kind === "projects" && kanban ? <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">{["Planned", "In Progress", "On Hold", "Completed", "Archived"].map((status) => <section key={status} className="rounded-xl border border-zinc-800 p-3">
      <h2 className="mb-2 font-semibold">{status}</h2>
      <ul className="space-y-2">{visible.filter((row) => (row.fields.status || "Planned") === status).map((row) => <li key={row.id} className="rounded bg-zinc-900 p-2">
        <button className="text-left text-green-400 underline" onClick={() => setDraft(row)}>{row.title}</button>
        <label className="mt-2 block text-sm">Move to<select className={control + " w-full"} disabled={busy} value={status} onChange={(event) => void mutate(() => putEntry(local, { ...row, fields: { ...row.fields, status: event.target.value } }))}>
          {["Planned", "In Progress", "On Hold", "Completed", "Archived"].map((target) => <option key={target}>{target}</option>)}
        </select></label>
      </li>)}</ul>
    </section>)}</div> : <ul className="space-y-2">{visible.map((row) => <li key={row.id} className="rounded-xl border border-zinc-800 p-3">
      <h2 className="font-semibold">{row.title} <time className="ml-2 text-sm text-zinc-400">{row.day}</time></h2>
      {kind === "learning" && n(row, "total") > 0 && <label className="flex items-center gap-2 text-sm text-zinc-400">Lesson progress <progress className="accent-green-500" max={n(row, "total")} value={Math.min(n(row, "lessons"), n(row, "total"))} />{n(row, "lessons")}/{n(row, "total")}</label>}
      {kind === "accounts" && (() => {
        const transactions = rows.filter((record) => record.kind === "finance" && record.day >= row.day && record.day <= today).map((record) => ({
          direction: String(record.fields.direction),
          amount: n(record, "amount"),
          account: String(record.fields.account || ""),
          destination: String(record.fields.destination || ""),
        }));
        const balance = accountBalance(row.title, n(row, "opening"), transactions);
        return <p className="text-sm text-zinc-400">Balance {display(balance)} {preferences?.fields.currency || "INR"}</p>;
      })()}
      {kind === "recipes" && (() => {
        const totals = ingredientTotals(row);
        if (!totals) return <p className="text-sm text-zinc-400">Add ingredients with available food definitions to calculate nutrients.</p>;
        return <p className="text-sm text-zinc-400">{display(totals.calories)} kcal per recipe · {display(totals.calories / n(row, "servings"))} kcal and {display(totals.protein / n(row, "servings"))} g protein per serving</p>;
      })()}
      {kind === "habits" && today && (() => {
        const days = new Map<string, number>();
        rows.filter((record) => record.kind === "habitlogs" && record.fields.habit === row.id).forEach((record) => {
          days.set(record.day, (days.get(record.day) ?? 0) + n(record, "amount"));
        });
        if (row.fields.frequency === "Weekly") {
          const weekStart = shiftDay(today, -((new Date(today + "T00:00:00Z").getUTCDay() + 6) % 7));
          const amount = [...days].filter(([day]) => day >= weekStart && day <= today).reduce((sum, [, value]) => sum + value, 0);
          return <p className="text-sm text-zinc-400">{display(amount)} / {display(n(row, "target") || 1)} this week</p>;
        }
        if (row.fields.frequency === "Selected weekdays") return <p className="text-sm text-zinc-400">{habitDue(row, today) ? "Scheduled today" : "Not scheduled today"}</p>;
        return <p className="text-sm text-zinc-400">{dailyStreak([...days].filter(([, amount]) => amount >= (n(row, "target") || 1)).map(([day]) => day), today)}-day streak</p>;
      })()}
      {kind === "workouts" && (() => {
        const sets = setRowsByExercise.filter((set) => set.fields.workout === row.id).sort((a, b) => n(a, "number") - n(b, "number"));
        return <details><summary>{sets.length} sets · {display(total(sets, "reps"))} reps</summary><ul>{sets.map((set) => <li key={set.id}>{rows.find((exercise) => exercise.id === set.fields.exercise)?.title ?? "Deleted exercise"} · {set.fields.type || "Set"} · {n(set, "reps")} × {n(set, "weight")} {set.fields.unit || "kg"}</li>)}</ul></details>;
      })()}
      {kind === "projects" && (() => {
        const milestones = rows.filter((record) => record.kind === "milestones" && record.fields.project === row.id);
        return <p className="text-sm text-zinc-400">{display(total(rows.filter((record) => record.kind === "work" && record.fields.project === row.id), "minutes") / 60)} hours logged{milestones.length ? " · " + milestones.filter((record) => record.fields.status === "Completed").length + "/" + milestones.length + " milestones complete" : ""}</p>;
      })()}
      {kind === "routines" && today && (() => {
        const steps = [...new Set(String(row.fields.steps || "").split("\n").map((step) => step.trim()).filter(Boolean))];
        const log = rows.find((record) => record.kind === "routinelogs" && record.day === today && record.fields.routine === row.id);
        const checked = String(log?.fields.done || "").split("\n").filter(Boolean);
        return <fieldset className="space-y-1 py-2"><legend className="text-sm text-zinc-400">Today&apos;s steps</legend>
          {steps.map((step) => <label key={step} className="flex items-center gap-2"><input type="checkbox" disabled={busy} checked={checked.includes(step)} onChange={(event) => {
            const done = event.target.checked ? [...checked, step] : checked.filter((current) => current !== step);
            void mutate(async () => {
              if (!done.length && log) await deleteEntry(local, log.id);
              else if (done.length) await putEntry(local, { ...(log ?? { ...make("routinelogs", row.title), day: today }), fields: { routine: row.id, done: done.join("\n") } });
            });
          }} />{step}</label>)}
        </fieldset>;
      })()}
      {kind === "budgets" && (() => {
        const spent = total(rows.filter((record) => record.kind === "finance" && record.day.startsWith(row.day.slice(0, 7)) && record.fields.direction === "Expense" && (!row.fields.category || String(record.fields.category || "").toLowerCase() === String(row.fields.category).toLowerCase())), "amount");
        return <p>{display(spent)} spent · {display(n(row, "amount") - spent)} remaining for {row.day.slice(0, 7)}</p>;
      })()}
      {kind === "goals" && row.fields.target !== undefined && row.fields.start !== undefined && n(row, "target") !== n(row, "start") && (() => {
        const scoped = rows.filter((record) => record.day >= row.day && record.day <= today);
        let current = row.fields.current === undefined || row.fields.current === "" ? undefined : n(row, "current");
        switch (row.fields.source) {
          case "Body weight (kg)": {
            const latest = scoped.filter((record) => record.kind === "measurements" && n(record, "weight")).sort((a, b) => b.day.localeCompare(a.day))[0];
            current = latest ? kilograms(n(latest, "weight"), String(latest.fields.unit)) : undefined;
            break;
          }
          case "Completed workout logs": current = scoped.filter((record) => record.kind === "workouts" && record.fields.status !== "Planned").length; break;
          case "Solved coding entries": current = scoped.filter((record) => record.kind === "coding" && record.fields.solved === "Yes").length; break;
          case "Linked quests completed": {
            const ids=String(row.fields.questIds||"").split(",");
            current=new Set(linked.awards.filter((award)=>!award.reversed&&award.day>=row.day&&award.day<=today&&ids.includes(award.quest_id)&&linked.quests.some((quest)=>quest.id===award.quest_id)).map((award)=>award.quest_id)).size;
            break;
          }
          case "Work hours": current = total(scoped.filter((record) => record.kind === "work"), "minutes") / 60; break;
          case "Net cash flow": current = cashFlow(scoped.filter((record) => record.kind === "finance").map((record) => ({ direction: String(record.fields.direction), amount: n(record, "amount") }))).net; break;
        }
        if (current === undefined) return <p className="text-sm text-zinc-400">No progress value recorded.</p>;
        const percent = (current - n(row, "start")) / (n(row, "target") - n(row, "start")) * 100;
        return <div><label className="text-sm" htmlFor={"goal-" + row.id}>{display(percent)}% toward goal · Current {display(current)}</label><progress className="ml-2 accent-green-500" id={"goal-" + row.id} value={Math.max(0, Math.min(100, percent))} max={100} /></div>;
      })()}
      {kind === "goals" && !!row.fields.milestones && (() => {
        const labels=[...new Set(String(row.fields.milestones).split("\n").map(item=>item.trim()).filter(Boolean))];
        const finished=String(row.fields.finishedMilestones || "").split("\n");
        return <div className="my-3 space-y-1"><h3 className="font-semibold">Milestone checklist</h3>{labels.map(label=><label key={label} className="flex min-h-10 items-center gap-2"><input type="checkbox" className="size-5 accent-emerald-400" disabled={busy} checked={finished.includes(label)} onChange={(event)=>void mutate(()=>putEntry(local,{...row,fields:{...row.fields,finishedMilestones:(event.target.checked?[...finished.filter(Boolean),label]:finished.filter(item=>item!==label)).join("\n")}}))}/>{label}</label>)}</div>;
      })()}
      <dl className="my-2 grid grid-cols-2 gap-2 text-sm md:grid-cols-3">{definition.fields.filter(({ key }) => row.fields[key] !== undefined && row.fields[key] !== "").map(({ key, label, relation }) => <div key={key}><dt className="text-zinc-400">{label}</dt><dd className="whitespace-pre-wrap break-words">{relation ? rows.find((target) => target.id === row.fields[key])?.title ?? "Deleted record" : String(row.fields[key])}</dd></div>)}</dl>
      <div className="flex flex-wrap gap-2"><button className={button} disabled={busy} onClick={() => setDraft(row)}>Edit</button>
        {kind !== "settings" && <button className={button} disabled={busy} onClick={() => {
          const copy = { ...row, id: crypto.randomUUID(), day: today };
          if (["plans", "workouts", "recipes"].includes(kind)) {
            const childKind = kind === "plans" ? "templates" : kind === "workouts" ? "sets" : "ingredients";
            const foreign = kind === "plans" ? "plan" : kind === "workouts" ? "workout" : "recipe";
            const children = rows.filter((entry) => entry.kind === childKind && entry.fields[foreign] === row.id).map((entry) => ({
              ...entry, id: crypto.randomUUID(), day: today, fields: { ...entry.fields, [foreign]: copy.id },
            }));
            if (kind === "workouts") {
              copy.fields = { ...copy.fields, status: "Planned", minutes: "" };
              children.forEach((entry) => { entry.fields.status = "Planned"; });
            }
            void mutate(async () => { await importEntries(local, [copy, ...children]); setDraft(copy); });
          } else setDraft(copy);
        }}>Duplicate</button>}
        {kind === "plans" && <>
          <button className={button} disabled={busy} onClick={() => { setKind("templates"); setDraft({ ...make("templates", "Planned set"), fields: { plan: row.id } }); }}>Add template set</button>
          <button className={button} disabled={busy} onClick={() => void mutate(async () => {
            const workout = { ...make("workouts", row.title), fields: { plan: row.id, status: "Planned", notes: String(row.fields.template || "") } };
            const sets = rows.filter((set) => set.kind === "templates" && set.fields.plan === row.id)
              .map((set) => ({ ...make("sets", set.title), fields: { ...set.fields, workout: workout.id, status: "Planned" } }));
            await importEntries(local, [workout, ...sets]);
            setKind("workouts");
          })}>Log workout from plan</button>
        </>}
        {kind === "workouts" && <button className={button} disabled={busy} onClick={() => { setKind("sets"); setDraft({ ...make("sets", "Set"), day: row.day, fields: { workout: row.id, type: "Working", unit: "kg", number: 1 + setRowsByExercise.filter((set) => set.fields.workout === row.id).length } }); }}>Add set</button>}
        {kind === "workouts" && row.fields.status === "Planned" && <button className={button} disabled={busy} onClick={() => void mutate(() => putEntry(local, { ...row, fields: { ...row.fields, status: "Completed" } }))}>Finish workout</button>}
        {kind === "workouts" && row.fields.status === "Planned" && !timer && <button className={button} disabled={busy} onClick={() => void mutate(() => putEntry(local, {
          ...make("timer", row.title), day: row.day, fields: { target: "workouts", result: row.id, started: Date.now(), carried: 0 },
        }))}>Start this workout timer</button>}
        {kind === "sets" && <button className={button} disabled={busy} onClick={() => void mutate(() => putEntry(local, { ...row, fields: { ...row.fields, status: row.fields.status === "Planned" ? "Completed" : "Planned" } }))}>{row.fields.status === "Planned" ? "Mark completed" : "Mark planned"}</button>}
        {kind === "sets" && n(row, "rest") > 0 && <button className={button} onClick={() => setRestUntil(Date.now() + n(row, "rest") * 1000)}>Start set rest timer</button>}
        {kind === "foods" && <button className={button} disabled={busy} onClick={() => { setKind("meals"); setDraft({ ...make("meals", row.title), fields: { food: row.id, quantity: n(row, "serving"), unit: row.fields.unit || "", ...scaleFood(row.fields, n(row, "serving")) } }); }}>Log food</button>}
        {kind === "mealtemplates" && <button className={button} disabled={busy} onClick={() => { setKind("meals"); setDraft({ ...make("meals",row.title),fields:{ ...row.fields, quantity:1, unit:"serving" } }); }}>Use template</button>}
        {kind === "recipes" && <>
          <button className={button} disabled={busy} onClick={() => { setKind("ingredients"); setDraft({ ...make("ingredients", "Ingredient"), fields: { recipe: row.id } }); }}>Add ingredient</button>
          <button className={button} disabled={busy} onClick={() => {
            const totals = ingredientTotals(row);
            if (!totals) { setError("Add valid ingredients first."); return; }
            setKind("meals");
            setDraft({ ...make("meals", row.title), fields: { ...scaleFood({ ...totals, serving: n(row, "servings") }, 1), quantity: 1, unit: "serving" } });
          }}>Log one serving</button>
        </>}
        {kind === "habits" && <button className={button} disabled={busy} onClick={() => { setKind("habitlogs"); setDraft({ ...make("habitlogs", row.title), fields: { habit: row.id, amount: 1 } }); }}>Log habit</button>}
        {kind === "projects" && <button className={button} disabled={busy} onClick={() => { setKind("milestones"); setDraft({ ...make("milestones"), fields: { project: row.id, status: "Open" } }); }}>Add milestone</button>}
        {kind === "subscriptions" && <button className={button} disabled={busy} onClick={() => {
          setKind("finance");
          setDraft({ ...make("finance", row.title), day: row.day, fields: { direction: "Expense", amount: n(row, "amount"), category: row.fields.category || "", account: row.fields.account || "" } });
        }}>Prepare expense log</button>}
        {kind === "subscriptions" && <button className={button} disabled={busy} onClick={() => void mutate(() => putEntry(local, { ...row, day: nextBill(row.day, String(row.fields.cycle || "Monthly")) }))}>Advance next due date</button>}
        <button className={button} disabled={busy} onClick={() => { if (confirm(["plans", "workouts", "recipes"].includes(kind) ? "Delete this record and its template sets, workout sets or recipe ingredients?" : "Delete this record?")) void mutate(async () => { await deleteEntry(local, row.id); if (draft?.id === row.id) setDraft(null); }); }}>Delete</button></div>
    </li>)}</ul>}
  </section></div>;
}
