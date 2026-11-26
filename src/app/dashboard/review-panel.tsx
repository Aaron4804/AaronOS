"use client";

import { useState } from "react";
import type { Entry } from "@/lib/tracker-repository";
import { muscleVolume, numberField, review, shiftDate, workoutHistory } from "@/lib/reviews";
import { csvCell } from "@/lib/tracker-math";

const fmt = (number: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(number);
const control = "rounded border border-zinc-700 bg-zinc-900 p-2";

export function WorkoutReview({ rows, today }: { rows: Entry[]; today?:string }) {
  const [exercise, setExercise] = useState("");
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const history = workoutHistory(rows, exercise).reverse();
  const muscles = today ? muscleVolume(rows,shiftDate(today,-6),today) : [];
  const peak = Math.max(1, ...history.map((row) => row.heaviest));
  const a = history.find((row) => row.workout.id === first) ?? history[1];
  const b = history.find((row) => row.workout.id === second) ?? history[0];
  return <section className="space-y-4 rounded-xl border border-zinc-800 p-4">
    <h2 className="font-semibold">Workout analytics</h2>
    <label className="block">Exercise <select className={control} value={exercise} onChange={(event) => { setExercise(event.target.value); setFirst(""); setSecond(""); }}>
      <option value="">All exercises</option>{rows.filter((row) => row.kind === "exercises").map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}
    </select></label>
    {!history.length ? <p className="text-zinc-400">Log a completed workout to see trends.</p> : <>
      {exercise && <div><h3>Heaviest set by workout (kg)</h3><ol className="space-y-1">{history.slice(0, 20).reverse().map((row) => <li className="grid grid-cols-[7rem_1fr_4rem] items-center gap-2 text-sm" key={row.workout.id}>
        <time>{row.workout.day}</time><meter className="w-full" aria-label={"Heaviest set on " + row.workout.day} max={peak} value={row.heaviest} /><span>{fmt(row.heaviest)}</span>
      </li>)}</ol></div>}
      {a && b && <div className="space-y-2">
        <div className="flex flex-wrap gap-2">{[[a.workout.id, setFirst, "Earlier workout"], [b.workout.id, setSecond, "Comparison workout"]].map(([value, setter, label]) => <label key={String(label)}>{String(label)} <select className={control} value={String(value)} onChange={(event) => (setter as (id: string) => void)(event.target.value)}>
          {history.map(({ workout }) => <option value={workout.id} key={workout.id}>{workout.day} · {workout.title}</option>)}
        </select></label>)}</div>
        <dl className="grid gap-2 sm:grid-cols-3">{[["Volume (kg × reps)", a.volume, b.volume], ["Reps", a.reps, b.reps], ["Estimated 1RM (kg)", a.estimatedMax, b.estimatedMax]].map(([label, left, right]) => <div key={label}><dt>{label}</dt><dd>{fmt(Number(left))} → {fmt(Number(right))} ({fmt(Number(right) - Number(left))})</dd></div>)}</dl>
      </div>}
      {!!muscles.length && <div className="space-y-2"><h3 className="font-semibold">Muscle-group volume · last seven days</h3>{muscles.map(([muscle,volume])=><div className="grid grid-cols-[minmax(5rem,1fr)_2fr_auto] items-center gap-2 text-sm" key={muscle}><span>{muscle}</span><meter className="w-full" aria-label={muscle+" volume"} max={Math.max(1,muscles[0][1])} value={volume}/><span>{fmt(volume)} kg × reps</span></div>)}</div>}
      <ol className="space-y-1">{history.slice(0, 12).map((row) => <li key={row.workout.id}>{row.workout.day} · {row.workout.title} · {row.sets.length} sets · {fmt(row.volume)} kg × reps · {numberField(row.workout, "minutes")} min</li>)}</ol>
    </>}
  </section>;
}

export default function ReviewPanel({ rows, today }: { rows: Entry[]; today: string }) {
  const [period, setPeriod] = useState("week");
  if (!today) return null;
  const from = period === "week" ? shiftDate(today, -6) : today.slice(0, 7) + "-01";
  const targets = rows.find((row) => row.kind === "settings");
  const result = review(rows, from, today, targets);
  const priorEnd = shiftDate(from,-1);
  const priorFrom = period==="week" ? shiftDate(priorEnd,-6) : priorEnd.slice(0,7)+"-01";
  const prior = review(rows,priorFrom,priorEnd,targets);
  const trend = review(rows, shiftDate(from, -6), today).weight.filter((point) => point.day >= from);
  const weeklyTarget = targets && numberField(targets, "work");
  return <section className="space-y-4 rounded-xl border border-zinc-800 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Personal review</h2>
      <select aria-label="Review period" className={control} value={period} onChange={(event) => setPeriod(event.target.value)}><option value="week">Last seven days</option><option value="month">Month to date</option></select></div>
    <p className="text-sm text-zinc-400">{from} to {today}</p>
    <p>{fmt((result.totals.work - result.totals.breaks) / 60)} productive work hours · {result.totals.workouts} workouts · {result.totals.habitLogs} habit logs · {fmt(result.totals.study / 60)} study hours</p>
    <details className="rounded-lg border border-zinc-700 p-3"><summary className="cursor-pointer">Compare previous {period==="week"?"seven days":"calendar month"}</summary>
      <p className="my-2 text-xs text-zinc-400">{priorFrom} to {priorEnd}</p>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[
        ["Work h",prior.totals.work/60,result.totals.work/60],["Study h",prior.totals.study/60,result.totals.study/60],
        ["Workouts",prior.totals.workouts,result.totals.workouts],["Habit logs",prior.totals.habitLogs,result.totals.habitLogs],
      ].map(([label,previous,current])=><div key={label}><dt className="text-sm text-zinc-400">{label}</dt><dd>{fmt(Number(previous))} → {fmt(Number(current))}</dd></div>)}</dl>
    </details>
    {period === "week" && !!weeklyTarget && <p>{fmt(result.totals.work)} of {fmt(weeklyTarget)} weekly work minutes logged.</p>}
    {!!result.projects.size && <ul>{[...result.projects].map(([id, minutes]) => <li key={id}>{rows.find((row) => row.id === id)?.title ?? "Unassigned project"} · {fmt(minutes / 60)} h</li>)}</ul>}
    {result.totals.work > 0 && <button type="button" className={control} onClick={() => {
      const sessions = rows.filter((row) => row.kind === "work" && row.day >= from && row.day <= today);
      const csv = [["Date", "Session", "Project", "Minutes", "Break minutes", "Productive minutes"], ...sessions.map((row) => {
        const minutes = numberField(row, "minutes");
        const breaks = numberField(row, "breaks");
        return [row.day, row.title, rows.find((entry) => entry.id === row.fields.project)?.title ?? "", minutes, breaks, minutes - breaks];
      })].map((record) => record.map(csvCell).join(",")).join("\r\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      Object.assign(document.createElement("a"), { href: url, download: "aaronos-timesheet-" + from + ".csv" }).click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }}>Export review timesheet</button>}
    <h3 className="font-medium">Nutrition adherence</h3>
    <p className="text-sm text-zinc-400">Averages and days within 10% of your current target use logged days only.</p>
    <ul>{result.nutrition.map((row) => <li className="capitalize" key={row.field}>{row.field}: {row.average === null ? "No logged days" : fmt(row.average) + " daily average"}{row.close !== null && row.days > 0 ? " · " + row.close + "/" + row.days + " days near target" : ""}</li>)}</ul>
    <h3 className="font-medium">Body weight</h3>
    <p>{result.averageWeight === null ? "No measurements in this period." : fmt(result.averageWeight) + " kg average across measured days"}</p>
    {!!trend.length && <ul className="text-sm text-zinc-400">{trend.slice(-10).map((row) => <li key={row.day}>{row.day} · {fmt(row.kg)} kg · 7-day average {fmt(row.rolling)} kg</li>)}</ul>}
  </section>;
}
