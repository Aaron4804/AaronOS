"use client";

import { useEffect, useRef, useState } from "react";
import type { Entry } from "@/lib/tracker-repository";

export default function ActiveWorkout({ workout, rows, busy, save, make }: {
  workout: Entry; rows: Entry[]; busy: boolean; save: (row: Entry) => Promise<void>; make: () => Entry;
}) {
  const [exercise, setExercise] = useState("");
  const [restUntil, setRestUntil] = useState(0);
  const pendingFields = useRef(new Map<string, Entry["fields"]>());
  const queue = useRef(Promise.resolve());
  function update(set: Entry, change: Entry["fields"]) {
    const fields = { ...set.fields, ...pendingFields.current.get(set.id), ...change };
    pendingFields.current.set(set.id, fields);
    queue.current = queue.current.then(async () => {
      await save({ ...set, fields });
      if (pendingFields.current.get(set.id) === fields) pendingFields.current.delete(set.id);
    });
  }
  const exercises = rows.filter((row) => row.kind === "exercises");
  const sets = rows.filter((row) => row.kind === "sets" && row.fields.workout === workout.id);
  const add = (id: string) => save({ ...make(), title: "Set", day: workout.day, fields: {
    workout: workout.id, exercise: id, unit: "kg", number: Math.max(0, ...sets.map((set) => Number(set.fields.number) || 0)) + 1, status: "Planned", type: "Working",
  } });
  return <section className="os-panel space-y-4">
    <div><p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">Active workout</p><h2 className="text-xl font-semibold">{workout.title}</h2></div>
    <div className="flex flex-wrap gap-2"><label className="sr-only" htmlFor="workout-exercise">Choose exercise</label>
      <select id="workout-exercise" className="min-w-0 rounded-lg border border-zinc-700 bg-zinc-900 p-2" value={exercise} onChange={(event) => setExercise(event.target.value)}><option value="">Choose exercise</option>{exercises.map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}</select>
      <button className="rounded-lg bg-emerald-400 px-3 py-2 font-semibold text-emerald-950 disabled:opacity-40" disabled={!exercise || busy} onClick={() => add(exercise)}>Add exercise</button>
    </div>
    {!exercises.length && <p className="text-sm text-zinc-400">Create an exercise in the exercise library to start logging sets.</p>}
    {!!restUntil && <RestCountdown until={restUntil} dismiss={() => setRestUntil(0)} />}
    {exercises.filter((row) => sets.some((set) => set.fields.exercise === row.id)).map((row) => {
      const previous = rows.filter((item) => item.kind === "sets" && item.fields.exercise === row.id && item.fields.workout !== workout.id && item.fields.status !== "Planned").sort((a, b) => b.day.localeCompare(a.day))[0];
      return <article className="rounded-xl border border-zinc-700 p-3" key={row.id}><div className="mb-3 flex flex-wrap justify-between gap-2"><div><h3 className="font-semibold">{row.title}</h3>{previous && <p className="text-xs text-zinc-400">Previous: {previous.fields.weight || 0} {previous.fields.unit || "kg"} × {previous.fields.reps || 0}</p>}</div>
        <button className="text-sm text-emerald-300" disabled={busy} onClick={() => add(row.id)}>Add set</button></div>
        <div className="grid grid-cols-[2rem_1fr_1fr_3rem] gap-2 text-xs text-zinc-400"><span>Set</span><span>Weight</span><span>Reps</span><span>Done</span></div>
        {sets.filter((set) => set.fields.exercise === row.id).sort((a,b)=>Number(a.fields.number)-Number(b.fields.number)).map((set) => <div className="mt-2 grid grid-cols-[2rem_1fr_1fr_3rem] items-center gap-2" key={set.id}>
          <span>{set.fields.number}</span>{["weight", "reps"].map((field) => <input key={field + String(set.fields[field])} aria-label={row.title + " set " + set.fields.number + " " + field} className="min-w-0 rounded-lg border border-zinc-700 bg-zinc-900 p-2" type="number" min="0" step={field === "reps" ? 1 : "any"} defaultValue={set.fields[field] ?? ""} onBlur={(event) => { const value = event.target.valueAsNumber; if (Number.isFinite(value) && value >= 0 && value !== set.fields[field]) update(set, { [field]: value }); }} />)}
          <input type="checkbox" className="size-5 accent-emerald-400" aria-label={"Complete set " + set.fields.number} checked={set.fields.status === "Completed"} disabled={busy} onChange={(event) => {
            if (event.target.checked && Number(set.fields.rest) > 0) setRestUntil(Date.now() + Number(set.fields.rest) * 1000);
            update(set, { status: event.target.checked ? "Completed" : "Planned" });
          }} />
        </div>)}
      </article>;
    })}
    <button className="text-sm text-emerald-300" onClick={() => setRestUntil(Date.now()+60_000)}>Start 60-second rest</button>
  </section>;
}

function RestCountdown({ until, dismiss }: { until: number; dismiss: () => void }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);
  return <p role="status" className="text-emerald-300">Rest: {Math.max(0, Math.ceil((until - now) / 1000))}s <button className="ml-2 underline" onClick={dismiss}>Dismiss</button></p>;
}
