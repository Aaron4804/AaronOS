import type { Entry } from "./tracker-repository";
import { kilograms, liftRecords, setVolume } from "./tracker-math";

export const numberField = (row: Entry, field: string) => Number(row.fields[field] || 0);
export const shiftDate = (day: string, days: number) => new Date(Date.parse(day) + days * 86_400_000).toISOString().slice(0, 10);

export function workoutHistory(rows: Entry[], exercise?: string) {
  const setsByWorkout = new Map<string, Entry[]>();
  for (const row of rows) {
    if (row.kind !== "sets" || row.fields.status === "Planned" || (exercise && row.fields.exercise !== exercise)) continue;
    const key = String(row.fields.workout);
    const sets = setsByWorkout.get(key) ?? [];
    sets.push(row);
    setsByWorkout.set(key, sets);
  }
  return rows.filter((row) => row.kind === "workouts" && row.fields.status !== "Planned")
    .flatMap((workout) => {
      const sets = setsByWorkout.get(workout.id) ?? [];
      if (exercise && !sets.length) return [];
      const lifts = sets.map((row) => ({ weight: numberField(row, "weight"), unit: String(row.fields.unit), reps: numberField(row, "reps"), type: String(row.fields.type).toLowerCase() }));
      return [{ workout, sets, reps: lifts.reduce((sum, lift) => sum + lift.reps, 0), volume: lifts.reduce((sum, lift) => sum + setVolume(lift.weight, lift.unit, lift.reps, lift.type), 0), ...liftRecords(lifts) }];
    }).sort((a, b) => a.workout.day.localeCompare(b.workout.day));
}

export function muscleVolume(rows: Entry[], from: string, to: string) {
  const exercises = new Map(rows.filter(row=>row.kind==="exercises").map(row=>[row.id,String(row.fields.muscle || "Unassigned")]));
  const totals = new Map<string,number>();
  for (const { workout, sets } of workoutHistory(rows)) {
    if (workout.day < from || workout.day > to) continue;
    for (const set of sets) {
      const muscle = exercises.get(String(set.fields.exercise)) || "Unassigned";
      const volume = setVolume(numberField(set,"weight"),String(set.fields.unit),numberField(set,"reps"),String(set.fields.type).toLowerCase());
      totals.set(muscle,(totals.get(muscle)??0)+volume);
    }
  }
  return [...totals].sort(([,a],[,b])=>b-a);
}

export function review(rows: Entry[], from: string, to: string, targets?: Entry) {
  const totals = { work: 0, breaks: 0, focus: 0, study: 0, workouts: 0, habitLogs: 0 };
  const nutrition = new Map<string, Record<string, number>>();
  const weights = new Map<string, { sum: number; count: number }>();
  const projects = new Map<string, number>();
  for (const row of rows) {
    if (row.day < from || row.day > to) continue;
    if (row.kind === "work") {
      totals.work += numberField(row, "minutes");
      totals.breaks += numberField(row, "breaks");
      const key = String(row.fields.project || "");
      projects.set(key, (projects.get(key) ?? 0) + numberField(row, "minutes"));
    }
    if (row.kind === "focus") totals.focus += numberField(row, "minutes");
    if (row.kind === "learning") totals.study += numberField(row, "minutes");
    if (row.kind === "workouts" && row.fields.status !== "Planned") totals.workouts++;
    if (row.kind === "habitlogs" && numberField(row, "amount") > 0) totals.habitLogs++;
    if (row.kind === "meals") {
      const values = nutrition.get(row.day) ?? {};
      for (const field of ["calories", "protein", "carbs", "fat"]) values[field] = (values[field] ?? 0) + numberField(row, field);
      nutrition.set(row.day, values);
    }
    if (row.kind === "measurements" && numberField(row, "weight") > 0) {
      const value = weights.get(row.day) ?? { sum: 0, count: 0 };
      weights.set(row.day, { sum: value.sum + kilograms(numberField(row, "weight"), String(row.fields.unit)), count: value.count + 1 });
    }
  }
  const dailyWeight = [...weights].sort(([a], [b]) => a.localeCompare(b)).map(([day, value]) => ({ day, kg: value.sum / value.count }));
  const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  return { totals, projects, weight: dailyWeight.map((point) => ({ ...point, rolling: mean(dailyWeight.filter((row) => row.day >= shiftDate(point.day, -6) && row.day <= point.day).map((row) => row.kg))! })),
    averageWeight: mean(dailyWeight.map((row) => row.kg)),
    nutrition: ["calories", "protein", "carbs", "fat"].map((field) => {
      const target = targets ? numberField(targets, field) : 0;
      const logged = [...nutrition.values()].map((row) => row[field]);
      return { field, target, average: mean(logged), days: logged.length, close: target ? logged.filter((value) => Math.abs(value - target) <= target * 0.1 + 1e-8).length : null };
    }),
  };
}
