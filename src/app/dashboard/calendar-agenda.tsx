"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readQuests, type QuestRecord } from "@/lib/quest-repository";
import { questSlot } from "@/lib/quest-occurrences";
import type { Entry } from "@/lib/tracker-repository";
import { plansForDay } from "@/lib/daily-planning";

export default function CalendarAgenda({ local, today, rows, onEdit, onNew }: { local: boolean; today: string; rows: Entry[]; onEdit: (row: Entry) => void; onNew: (day: string) => void }) {
  const [anchor, setAnchor] = useState("");
  const [days, setDays] = useState(31);
  const [selected, setSelected] = useState("");
  const [quests, setQuests] = useState<QuestRecord[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { readQuests(local).then(setQuests, () => setError("Quest schedule unavailable.")); }, [local]);
  const start = anchor || today;
  if (!start) return null;
  const monthStart = start.slice(0, 7) + "-01";
  const monthOffset = (new Date(monthStart + "T00:00:00Z").getUTCDay() + 6) % 7;
  const gridStart = days === 31 ? Date.parse(monthStart) - monthOffset * 86_400_000 : Date.parse(start);
  const dates = Array.from({ length: days === 31 ? 42 : days }, (_, index) => new Date(gridStart + index * 86_400_000).toISOString().slice(0, 10));
  const agendaDay = selected || start;
  function navigate(direction: number) {
    const value = new Date(start);
    if (days === 31) { value.setUTCDate(1); value.setUTCMonth(value.getUTCMonth() + direction); }
    else value.setUTCDate(value.getUTCDate() + days * direction);
    const next = value.toISOString().slice(0, 10);
    setAnchor(next); setSelected(next);
  }
  function matching(day: string) {
    return rows.filter((row) => {
      if (row.kind === "plans") return plansForDay(rows,day).some((plan)=>plan.id===row.id);
      if (row.kind === "events") {
        const interval = Number(row.fields.repeat || 0);
        const until = String(row.fields.until || "");
        const schedule = String(row.fields.weekdays || "").toLowerCase().split(",").map((item)=>item.trim()).filter(Boolean);
        if (schedule.length) {
          const weekday = ["sun","mon","tue","wed","thu","fri","sat"][new Date(day).getUTCDay()];
          return day >= row.day && (!until || day <= until) && schedule.includes(weekday);
        }
        return row.day === day || Boolean(interval && (!until || day <= until) && questSlot(row.day, interval, day));
      }
      if (row.kind === "projects" || row.kind === "goals") return row.fields.deadline === day;
      return ["milestones", "diets"].includes(row.kind) && row.day === day;
    }).sort((a,b) => String(a.fields.time ?? "").localeCompare(String(b.fields.time ?? "")));
  }
  const badge = (key: string) => ["bg-sky-400","bg-emerald-400","bg-violet-400","bg-amber-400","bg-pink-400"][Array.from(key).reduce((n,c) => n + c.charCodeAt(0), 0) % 5];
  return <section className="os-panel space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">{new Intl.DateTimeFormat("en-IN",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(start))}</h2><button className="rounded-lg bg-emerald-400 px-3 py-2 font-semibold text-emerald-950" onClick={() => onNew(agendaDay)}>Add event</button></div>
    <div className="flex flex-wrap gap-3">
      <button className="rounded bg-zinc-800 p-2" aria-label="Previous period" onClick={() => navigate(-1)}>←</button><button className="rounded bg-zinc-800 p-2" onClick={() => { setAnchor(today);setSelected(today); }}>Today</button><button className="rounded bg-zinc-800 p-2" aria-label="Next period" onClick={() => navigate(1)}>→</button>
      <label>Starting <input type="date" className="rounded bg-zinc-900 p-2" value={start} onChange={(event) => { setAnchor(event.target.value); setSelected(event.target.value); }} /></label>
      <label>Range <select className="rounded bg-zinc-900 p-2" value={days} onChange={(event) => setDays(Number(event.target.value))}><option value={1}>Day</option><option value={7}>Week</option><option value={31}>Month</option></select></label>
    </div>
    {error && <p role="status">{error}</p>}
    {days > 1 && <div className="grid grid-cols-7 gap-1">{dates.slice(0,7).map((day)=><span className="text-center text-xs text-zinc-400" key={"weekday"+day}>{new Intl.DateTimeFormat("en",{weekday:"short",timeZone:"UTC"}).format(new Date(day))}</span>)}{dates.map((day) => <button key={day} aria-label={day} aria-pressed={day===agendaDay} onClick={() => setSelected(day)} className={"min-h-12 min-w-0 rounded-md border p-1 text-sm " + (day===agendaDay?"border-emerald-400 bg-emerald-950":"border-zinc-800 bg-zinc-900") + (days===31 && day.slice(0,7)!==start.slice(0,7)?" text-zinc-500":"")}>
      {Number(day.slice(-2))}<span className="flex justify-center gap-0.5">{matching(day).slice(0,3).map((row) => <span key={row.id} className={"size-1.5 rounded-full " + badge(String(row.fields.category || row.kind))} />)}</span>
    </button>)}</div>}
    <h3 className="font-semibold">Daily agenda · {agendaDay}</h3>
    <ol className="space-y-1">{[agendaDay].map((day) => {
      const matches = matching(day);
      const due = quests.filter((quest) => !quest.archived && (quest.repeat_days || quest.weekdays?.length ? questSlot(quest.due_on, quest.repeat_days ?? 0, day, quest.weekdays) : quest.due_on === day));
      return <li key={day} className={"min-w-0 break-words rounded bg-zinc-900 p-2" + (days === 31 && day.slice(0, 7) !== start.slice(0, 7) ? " opacity-50" : "")}>
        {!matches.length && !due.length && <p className="text-sm text-zinc-400">No scheduled items</p>}
        <ul>{matches.map((row) => {
          const label = (row.fields.time ? row.fields.time + " · " : "") + row.title;
          const group = ["projects", "milestones"].includes(row.kind) ? "work" : row.kind === "diets" ? "nutrition" : row.kind === "plans" ? "fitness" : "";
          return <li key={row.id} className="flex items-center gap-2 py-2"><span className={"size-2 rounded-full " + badge(String(row.fields.category || row.kind))} />{group
            ? <Link className="text-green-400 underline" href={`/dashboard/${group}?kind=${row.kind}&record=${row.id}`}>{label}</Link>
            : <button className="text-left text-green-400 underline" onClick={() => onEdit(row)}>{label}</button>}</li>;
        })}
          {due.map((quest) => <li key={quest.id}><Link href="/dashboard/quests" className="text-green-400 underline">{quest.title}</Link></li>)}</ul>
      </li>;
    })}</ol>
  </section>;
}
