"use client";

import { useState } from "react";
import type { Entry } from "@/lib/tracker-repository";
import { kilograms } from "@/lib/tracker-math";

const metricFields = [
  ["Work hours", "work", "minutes", 60],
  ["Focus minutes", "focus", "minutes", 1],
  ["Calories", "meals", "calories", 1],
  ["Protein (g)", "meals", "protein", 1],
  ["Hydration (ml)", "wellness", "water", 1],
  ["Body weight (kg)", "measurements", "weight", 1],
] as const;

export default function TrendBars({ entries, from, to, only }: { entries: Entry[]; from: string; to: string; only?: string }) {
  const [selected, setSelected] = useState("");
  return <div className={only ? "grid gap-3" : "grid gap-3 md:grid-cols-2"}>{metricFields.filter(([, kind]) => !only || kind === only).map(([label, kind, key, divisor]) => {
    const points = new Map<string, number>();
    for (const record of entries) {
      if (record.kind !== kind || record.day < from || record.day > to || typeof record.fields[key] !== "number") continue;
      const value = Number(record.fields[key]);
      if (kind === "measurements") points.set(record.day, kilograms(value, String(record.fields.unit)));
      else points.set(record.day, (points.get(record.day) ?? 0) + value / divisor);
    }
    const recent = [...points].sort(([left], [right]) => left.localeCompare(right)).slice(-30);
    const max = Math.max(1, ...recent.map(([, value]) => value));
    return <details key={label} open={only ? true : undefined} className="rounded-xl border border-zinc-800 p-3">
      <summary>{label} · {recent.length} logged day{recent.length === 1 ? "" : "s"}</summary>
      {recent.length ? <ul className="mt-2 space-y-2">{recent.map(([day, value]) => <li key={day} className="grid grid-cols-[6rem_minmax(0,1fr)_3.5rem] items-center gap-2 text-xs">
        <button className={"min-h-8 rounded text-left " + (selected===label+day?"text-emerald-300":"text-zinc-300")} aria-pressed={selected===label+day} onClick={()=>setSelected(label+day)}>{day}</button><meter aria-label={label + " on " + day} className="w-full" min={0} max={max} value={value} /><span className="text-right">{Math.round(value * 100) / 100}</span>
        {selected===label+day && <p className="col-span-3 text-emerald-300">{label} · {day} · {Math.round(value*100)/100}</p>}
      </li>)}</ul> : <p className="text-sm text-zinc-400">No records in this date range.</p>}
    </details>;
  })}</div>;
}
