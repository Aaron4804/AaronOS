"use client";

import { useEffect, useState } from "react";
import { readAwards, readQuests } from "@/lib/quest-repository";
import { activityCredits, type Entry } from "@/lib/tracker-repository";
import { trackers } from "@/lib/tracker-definitions";

type Item = { id: string; day: string; title: string; type: string; detail?: string };

export default function ActivityHistory({ local, rows, from, to }: { local: boolean; rows: Entry[]; from: string; to: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [limit, setLimit] = useState(25);
  useEffect(() => {
    let active = true;
    Promise.all([readQuests(local), readAwards(local), activityCredits(local)]).then(([quests, awards, trackerAwards]) => {
      if (!active) return;
      const names = new Map(quests.map((row) => [row.id, row.title]));
      setItems([
        ...awards.flatMap((row): Item[] => names.has(row.quest_id) ? [{ ...row, title: names.get(row.quest_id)!, type: "Quest XP", detail: row.xp + " XP" + (row.reversed ? " reversed" : "") }] : []),
        ...trackerAwards.map((row) => ({ ...row, title: trackers[row.kind]?.title ?? row.kind, type: "Tracker XP", detail: row.xp + " XP" + (row.reversed ? " reversed" : "") })),
      ]);
    }, () => { if (active) setError("Some XP records could not be loaded."); });
    return () => { active = false; };
  }, [local]);
  const all = [...items, ...rows.filter((row) => !["settings", "timer"].includes(row.kind)).map((row) => ({
    id: row.id, day: row.day, title: row.title, type: trackers[row.kind]?.title || row.kind,
  } as Item))];
  const types = [...new Set(all.map((item) => item.type))].sort();
  const visible = all.filter((item) => item.day >= from && item.day <= to && (!filter || filter === item.type)).sort((a, b) => b.day.localeCompare(a.day));
  return <section className="space-y-3 rounded-xl border border-zinc-800 p-4">
    <h2 className="font-semibold">Unified activity history</h2>
    <label>Category <select className="rounded border border-zinc-700 bg-zinc-900 p-2" value={filter} onChange={(event) => { setFilter(event.target.value); setLimit(25); }}>
      <option value="">All activity</option>{types.map((type) => <option key={type}>{type}</option>)}
    </select></label>
    {error && <p role="status">{error}</p>}
    {visible.length ? <ol className="divide-y divide-zinc-800">{visible.slice(0, limit).map((item) => <li className="py-2" key={item.type + item.id}>
      <p>{item.title}{item.detail ? " · " + item.detail : ""}</p><p className="text-sm text-zinc-400">{item.day} · {item.type}</p>
    </li>)}</ol> : <p className="text-zinc-400">No activity for this range and category.</p>}
    {visible.length > limit && <button className="rounded bg-zinc-800 px-3 py-2" onClick={() => setLimit(limit + 25)}>Show 25 more</button>}
  </section>;
}
