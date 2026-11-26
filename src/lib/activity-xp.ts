import type { Entry } from "./tracker-repository";

export type ActivityCredit = { id: string; day: string; xp: number; kind: string; reversed: boolean };

const rules: Record<string, number> = { workouts: 50, focus: 25, habitlogs: 10, coding: 30, milestones: 100 };

export function updateActivityCredit(rows: Entry[], row: Entry, removing = false) {
  const defaults = rules[row.kind];
  if (defaults === undefined) return rows;
  const active = rows.find((candidate) => candidate.kind === "internal-award" && candidate.fields.source === row.id && candidate.fields.reversed !== "yes");
  const eligible = row.kind === "workouts" ? row.fields.status !== "Planned" :
    row.kind === "focus" ? Number(row.fields.minutes) >= 1 :
    row.kind === "coding" ? row.fields.solved === "Yes" :
    row.kind === "milestones" ? row.fields.status === "Completed" : Number(row.fields.amount) > 0;
  if (removing || !eligible) return active ? rows.map((candidate) => candidate.id === active.id ? { ...candidate, fields: { ...candidate.fields, reversed: "yes" } } : candidate) : rows;
  if (active) return rows;
  const settings = rows.find((candidate) => candidate.kind === "settings");
  const value = settings?.fields["reward_" + row.kind];
  const xp = typeof value === "number" ? Math.max(0, Math.min(100000, Math.round(value))) : defaults;
  return [...rows, { id: crypto.randomUUID(), kind: "internal-award", title: row.title, day: row.day, fields: { source: row.id, sourceKind: row.kind, xp, reversed: "no" } }];
}
