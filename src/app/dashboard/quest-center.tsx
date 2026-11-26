"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { readQuests, readAwards, setCompletion, saveQuest, removeQuest, type QuestRecord } from "@/lib/quest-repository";
import { questSlot, type Award } from "@/lib/quest-occurrences";
import { dayKey, recentActivity, summarize } from "@/lib/quest-stats";
import Heatmap from "@/components/dashboard/Heatmap";
import { activityCredits, entries, importEntries, type Entry } from "@/lib/tracker-repository";
import { achievementId, categoryThreshold } from "@/lib/progression";
import { supabase } from "@/lib/supabase";
import type { ActivityCredit } from "@/lib/activity-xp";

const repeating = (quest: QuestRecord) => Boolean(quest.repeat_days || quest.weekdays?.length);
const slotFor = (quest: QuestRecord, day: string) => questSlot(quest.due_on, quest.repeat_days ?? 0, day, quest.weekdays);
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function QuestCenter({ local, compact = false }: { local: boolean; compact?: boolean }) {
  const add = useSearchParams().get("add");
  const dialog = useRef<HTMLDialogElement>(null);
  const openedFromLink = useRef(false);
  const [quests, setQuests] = useState<QuestRecord[] | null>(null);
  const [error, setError] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  useEffect(() => {
    if (add !== "1") openedFromLink.current = false;
    if (add === "1" && quests && dialog.current && !openedFromLink.current) {
      openedFromLink.current = true;
      dialog.current.showModal();
    }
  }, [add, quests]);
  const [title, setTitle] = useState("");
  const [xp, setXp] = useState(20);
  const [due, setDue] = useState("");
  const [editing, setEditing] = useState<QuestRecord | null>(null);
  const [pending, setPending] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [today, setToday] = useState("");
  const [repeat, setRepeat] = useState(0);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [occurrence, setOccurrence] = useState("");
  const [awards, setAwards] = useState<Award[]>([]);
  const [zone, setZone] = useState("Asia/Kolkata");
  const [levelXp, setLevelXp] = useState(100);
  const [showXp, setShowXp] = useState(true);
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [notes, setNotes] = useState("");
  const [adjustments, setAdjustments] = useState<Entry[]>([]);
  const [activityXp, setActivityXp] = useState<ActivityCredit[]>([]);
  const [categoryLevels, setCategoryLevels] = useState("");
  const [unlocks, setUnlocks] = useState<Entry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    let configuredZone = "Asia/Kolkata";
    const updateDate = () => setToday(dayKey(new Date(), configuredZone));
    const timer = window.setInterval(updateDate, 15_000);
    updateDate();
    entries(local).then((rows) => {
      if (cancelled) return;
      const settings = rows.find((row) => row.kind === "settings")?.fields;
      setAdjustments(rows.filter((row) => row.kind === "adjustments"));
      setUnlocks(rows.filter((row) => row.kind === "achievements"));
      setCategoryLevels(String(settings?.categoryLevels || ""));
      configuredZone = String(settings?.timezone || configuredZone);
      setShowXp(settings?.gamification !== "No");
      setLevelXp(Math.max(1, Number(settings?.xpPerLevel) || 100));
      try { dayKey(new Date(), configuredZone); } catch { configuredZone = "Asia/Kolkata"; }
      setZone(configuredZone);
      updateDate();
    }, () => {});
    Promise.all([readQuests(local), readAwards(local)]).then(([records, credits]) => {
      setQuests(records);
      setAwards(credits);
    }, (cause: Error) => setError(cause.message));
    activityCredits(local).then(setActivityXp, (cause: Error) => setError(cause.message));
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [local]);

  async function mutate(action: () => Promise<void>) {
    setPending(true);
    setError("");
    try {
      await action();
      const [records, credits] = await Promise.all([readQuests(local), readAwards(local)]);
      setQuests(records);
      setAwards(credits);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The operation failed.");
    } finally {
      setPending(false);
    }
  }

  const day = occurrence || today;
  const active = awards.filter((award) => !award.reversed && quests?.some(({ id }) => id === award.quest_id));
  const credits = active.map((award) => ({ id: award.id, title: "", xp: award.xp, due_on: null, completed_on: award.day }));
  const stats = summarize(credits, today, levelXp);
  const categoryTotals = new Map<string, number>();
  for (const credit of active) {
    const category = quests?.find((quest) => quest.id === credit.quest_id)?.category || "Uncategorized";
    categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + credit.xp);
  }
  const achievements = [
    { code: "first-quest", title: "First quest completed", unlocked: active.length >= 1 },
    { code: "ten-quests", title: "Ten quests completed", unlocked: active.length >= 10 },
    { code: "week-streak", title: "Seven-day quest streak", unlocked: stats.longest >= 7 },
    { code: "first-workout", title: "First workout logged", unlocked: activityXp.some((row) => row.kind === "workouts" && !row.reversed) },
  ];
  const pendingUnlocks = JSON.stringify(achievements.filter((badge) => badge.unlocked && !unlocks?.some((row) => row.fields.code === badge.code)));
  useEffect(() => {
    if (unlocks === null || !today || !showXp || pendingUnlocks === "[]") return;
    let live = true;
    void (async () => {
      const owner = local ? "browser" : (await supabase?.auth.getUser())?.data.user?.id;
      if (!owner) return;
      const badges: { code: string; title: string }[] = JSON.parse(pendingUnlocks);
      await importEntries(local, await Promise.all(badges.map(async (badge) => ({
        id: await achievementId(owner, badge.code), kind: "achievements", title: badge.title, day: today, fields: { code: badge.code },
      }))));
      if (live) setUnlocks((await entries(local)).filter((row) => row.kind === "achievements"));
    })().catch(() => { if (live) setError("Achievement history could not be saved."); });
    return () => { live = false; };
  }, [local, pendingUnlocks, showXp, today, unlocks]);
  const xpEntries = [
    ...credits,
    ...activityXp.filter((row) => !row.reversed).map((row) => ({ id: row.id, title: row.kind, xp: row.xp, due_on: null, completed_on: row.day })),
    ...adjustments.map((row) => ({ id: row.id, title: row.title, xp: Number(row.fields.delta || 0), due_on: null, completed_on: row.day })),
  ];
  const adjusted = summarize(xpEntries, today, levelXp);
  const levelProgress = Math.max(0, adjusted.total) % levelXp;
  const weeklyXp = recentActivity(xpEntries, today).reduce((sum, row) => sum + row.xp, 0);
  const monthlyXp = xpEntries.filter((row) => row.completed_on.startsWith(today.slice(0, 7))).reduce((sum, row) => sum + row.xp, 0);
  const completed = (quest: QuestRecord) => active.some((award) => award.quest_id === quest.id && award.slot === slotFor(quest, day));
  const dueToday = (quests ?? []).filter((quest) => !quest.archived && (repeating(quest) ? slotFor(quest, today) : quest.due_on === today));
  const remaining = dueToday.filter((quest) => !active.some((award) => award.quest_id === quest.id && award.slot === slotFor(quest, today))).length;
  const overdue = (quests ?? []).filter((quest) => !quest.archived && !repeating(quest) && quest.due_on && quest.due_on < today && !active.some((award) => award.quest_id === quest.id)).length;
  const visible = (quests ?? []).filter((quest) => {
    if (categoryFilter && quest.category !== categoryFilter) return false;
    if (![quest.title, quest.category, quest.notes, quest.priority].some((value) => value?.toLowerCase().includes(search.toLowerCase()))) return false;
    if (filter === "archived") return quest.archived;
    if (quest.archived) return false;
    if (filter === "completed") return active.some((award) => award.quest_id === quest.id);
    if (filter === "today") return repeating(quest) ? Boolean(slotFor(quest, today)) : quest.due_on === today || active.some((award) => award.quest_id === quest.id && award.day === today);
    if (filter === "upcoming") return !completed(quest) && quest.due_on && quest.due_on > today;
    if (filter === "overdue") return !repeating(quest) && !completed(quest) && quest.due_on && quest.due_on < today;
    return true;
  });
  const field = "rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-sm";
  const button = "rounded-lg bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700 disabled:opacity-50";

  function resetForm() {
    setEditing(null);
    setTitle("");
    setXp(20);
    setDue("");
    setRepeat(0);
    setSelectedDays([]);
    setCategory("");
    setPriority("Normal");
    setNotes("");
  }

  return (
    <>
      {error && <p role="alert" className="rounded-lg border border-red-900 bg-red-950 p-3">{error}</p>}
      {quests === null && !error && <p role="status">Loading quests…</p>}
      {quests !== null && <>
        <section aria-label="Progress" className="os-hero space-y-3">
          <div className="flex flex-wrap justify-between gap-3"><div><p className="text-sm text-emerald-200">{today || zone}</p><h2 className="text-2xl font-semibold">{showXp ? "Level " + Math.max(1, adjusted.level) : "Quest progress"}</h2></div>{compact && <Link className={button} href="/dashboard/quests">Open quests</Link>}</div>
          {showXp && <progress aria-label="Next level" className="block w-full accent-emerald-400" value={levelProgress} max={levelXp} />}
          <div className="flex flex-wrap gap-4 text-sm">
          {[
            ...(showXp ? [["Lifetime XP", adjusted.total], ["XP today", adjusted.todayXp], ...(!compact ? [["XP · last 7 days", weeklyXp], ["XP this month", monthlyXp]] : [])] : []),
            ["Completed today", stats.completedToday],
            ["Due today · remaining", remaining],
            ["Due today · completion", dueToday.length ? Math.round((1 - remaining / dueToday.length) * 100) + "%" : "—"],
            ["Overdue quests", overdue],
            ["Current streak", stats.streak],
            ["Longest streak", stats.longest],
          ].map(([label, value]) => <div key={label}><p className="text-zinc-400">{label}</p><p className="text-lg font-semibold">{value}</p></div>)}
          </div>
        </section>
        {showXp && <details className="rounded-xl border border-zinc-800 p-4">
          <summary>Achievements and category progress</summary>
          <ul>{achievements.map((badge) => { const saved = unlocks?.find((row) => row.fields.code === badge.code); return <li key={badge.title}>{badge.title} · {saved ? "Unlocked " + saved.day : badge.unlocked ? "Unlocked" : "Locked"}</li>; })}</ul>
          {!!categoryTotals.size && <ul className="mt-3">{[...categoryTotals].map(([category, xp]) => { const threshold = categoryThreshold(categoryLevels, category, levelXp); return <li key={category}>{category} · Level {Math.floor(xp / threshold) + 1} · {xp} quest XP</li>; })}</ul>}
        </details>}
        <section className="os-panel space-y-3">
          <h2 className="font-semibold">Quest XP over the last seven days</h2>
          <Heatmap week={recentActivity(credits, today)} />
        </section>
        {!compact && <><section id="quests" className="os-panel space-y-4">
          <div className="flex items-center justify-between"><h2 className="font-semibold">Quest log</h2><button className="rounded-lg bg-emerald-400 px-3 py-2 font-semibold text-emerald-950" onClick={() => { resetForm(); dialog.current?.showModal(); }}>Add Quest</button></div>
          <dialog ref={dialog} className="os-dialog" onClose={resetForm} aria-labelledby="quest-dialog-title">
          <h2 id="quest-dialog-title" className="mb-4 text-xl font-semibold">{editing ? "Edit quest" : "New quest"}</h2>
          <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => {
            event.preventDefault();
            void mutate(async () => {
              await saveQuest(local, { id: editing?.id ?? crypto.randomUUID(), title: title.trim(), xp, due_on: due || null, completed_on: editing?.completed_on ?? null, repeat_days: repeat, weekdays: selectedDays, archived: editing?.archived, category: category.trim(), priority, notes });
              dialog.current?.close();
            });
          }}>
            <label className="grid min-w-36 flex-1 gap-1 text-sm">Title<input id="quest-title" className={field} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} required /></label>
            <label className="grid gap-1 text-sm">XP<input className={field + " w-24"} type="number" min="0" max="100000" value={xp} onChange={(event) => setXp(event.target.valueAsNumber || 0)} required /></label>
            <label className="grid gap-1 text-sm">{repeat || selectedDays.length ? "Start date" : "Due date"}<input className={field} type="date" required={repeat > 0 || selectedDays.length > 0} value={due} onChange={(event) => setDue(event.target.value)} /></label>
            <label className="grid gap-1 text-sm">Repeat every N days (0 = once)<input className={field} type="number" min="0" max="365" value={repeat} disabled={selectedDays.length > 0} onChange={(event) => setRepeat(event.target.valueAsNumber || 0)} /></label>
            <fieldset className="flex flex-wrap gap-2"><legend className="text-sm">Or repeat on weekdays</legend>{weekdays.map((weekday, index) => <label key={weekday} className="flex items-center gap-1 text-sm"><input type="checkbox" checked={selectedDays.includes(index)} onChange={(event) => {
              setRepeat(0);
              setSelectedDays(event.target.checked ? [...selectedDays, index] : selectedDays.filter((entry) => entry !== index));
            }} />{weekday}</label>)}</fieldset>
            <label className="grid gap-1 text-sm">Category<input className={field} list="quest-categories" maxLength={80} value={category} onChange={(event) => setCategory(event.target.value)} /></label>
            <datalist id="quest-categories">{[...new Set(["Career", "Coding", "Learning", "Health", "Fitness", "Personal", "Finance", "Projects", ...quests.flatMap((quest) => quest.category ? [quest.category] : [])])].map((value) => <option key={value} value={value} />)}</datalist>
            <label className="grid gap-1 text-sm">Priority<select className={field} value={priority} onChange={(event) => setPriority(event.target.value)}>{["Low", "Normal", "High", "Urgent"].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label className="grid w-full gap-1 text-sm">Notes<textarea className={field} maxLength={12000} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
            <button className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold hover:bg-green-500 disabled:opacity-50" disabled={pending}>{editing ? "Save quest" : "Add quest"}</button>
            <button type="button" className={button} onClick={() => dialog.current?.close()}>Cancel</button>
          </form>
          </dialog>
          <div className="flex flex-wrap gap-2">
            <input aria-label="Search quests" placeholder="Search quests" className={field} value={search} onChange={(event) => setSearch(event.target.value)} />
            <select aria-label="Quest category" className={field} value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="">All categories</option>{[...new Set(quests.map((quest) => quest.category).filter(Boolean))].map((item) => <option key={item}>{item}</option>)}</select>
            <select aria-label="Quest view" className={field} value={filter} onChange={(event) => setFilter(event.target.value)}>
              {["all", "today", "upcoming", "overdue", "completed", "archived"].map((view) => <option key={view} value={view}>{view[0].toUpperCase() + view.slice(1)}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm">Completion date<input className={field} type="date" max={today} value={day} onChange={(event) => setOccurrence(event.target.value)} /></label>
          </div>
          {!visible.length && <p className="text-sm text-zinc-400">No quests in this view.</p>}
          <ul className="divide-y divide-zinc-800">
            {visible.map((quest) => <li key={quest.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div><p className={completed(quest) ? "line-through" : ""}>{quest.title}</p><p className="text-sm text-zinc-400">{quest.xp} XP{quest.due_on ? " · " + quest.due_on : ""}{quest.repeat_days ? " · Every " + quest.repeat_days + " day(s)" : ""}{quest.weekdays?.length ? " · " + quest.weekdays.map((index) => weekdays[index]).join(", ") : ""}</p></div>
              {(quest.category || quest.priority || quest.notes) && <p className="whitespace-pre-wrap text-sm text-zinc-400">{[quest.category, quest.priority, quest.notes].filter(Boolean).join(" · ")}</p>}
              <div className="flex flex-wrap gap-2">
                <button className={button} disabled={pending || quest.archived || day > today || !slotFor(quest, day)} onClick={() => void mutate(() => setCompletion(local, quest, day, !completed(quest)))}>{completed(quest) ? "Undo completion" : "Complete"}</button>
                <button className={button} disabled={pending} onClick={() => { setEditing(quest); setTitle(quest.title); setXp(quest.xp); setDue(quest.due_on ?? ""); setRepeat(quest.repeat_days ?? 0); setSelectedDays(quest.weekdays ?? []); setCategory(quest.category ?? ""); setPriority(quest.priority ?? "Normal"); setNotes(quest.notes ?? ""); dialog.current?.showModal(); }}>Edit</button>
                <button className={button} disabled={pending} onClick={() => void mutate(() => saveQuest(local, { ...quest, id: crypto.randomUUID(), completed_on: null, archived: false }))}>Duplicate</button>
                <button className={button} disabled={pending} onClick={() => void mutate(() => saveQuest(local, { ...quest, archived: !quest.archived }))}>{quest.archived ? "Restore" : "Archive"}</button>
                <button className={button} disabled={pending} onClick={() => { if (window.confirm("Delete this quest and its XP credit?")) void mutate(async () => { await removeQuest(local, quest.id); if (editing?.id === quest.id) resetForm(); }); }}>Delete</button>
              </div>
            </li>)}
          </ul>
        </section>
        <details className="rounded-xl border border-zinc-800 p-4">
          <summary>Quest XP history</summary>
          <ul>{awards.filter((award) => quests.some((quest) => quest.id === award.quest_id)).slice().reverse().map((award) => <li key={award.id} className="py-1 text-sm">{award.day} · {quests.find((quest) => quest.id === award.quest_id)?.title} · {award.xp} XP{award.reversed ? " (reversed)" : ""}</li>)}</ul>
          <ul>{activityXp.slice().reverse().map((award) => <li key={award.id} className="py-1 text-sm">{award.day} · {award.kind} · {award.xp} XP{award.reversed ? " (reversed)" : ""}</li>)}</ul>
        </details></>}
      </>}
    </>
  );
}
