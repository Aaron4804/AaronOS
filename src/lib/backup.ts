import { awardStorageKey, questStorageKey, readAwards, readQuests, type QuestRecord } from "./quest-repository";
import { type Award } from "./quest-occurrences";
import { trackerStorageKey, validateEntry, type Entry } from "./tracker-repository";
import { supabase } from "./supabase";

type TrackerAward = { id: string; source_id: string; kind: string; day: string; xp: number; reversed: boolean };
export type Backup = { format: "AaronOS"; version: 1; quests: QuestRecord[]; questAwards: Award[]; entries: Entry[]; trackerAwards: TrackerAward[] };
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
const isId = (value: unknown): value is string => typeof value === "string" && uuid.test(value);
const day = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const xp = (value: unknown) => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100000;

export function validateBackup(input: unknown): Backup {
  const file = input as Backup;
  if (!file || file.format !== "AaronOS" || file.version !== 1) throw new Error("Choose an AaronOS version 1 backup.");
  for (const rows of [file.quests, file.questAwards, file.entries, file.trackerAwards]) {
    if (!Array.isArray(rows) || rows.length > 50000 || rows.some((row) => !row || !isId(row.id)) || new Set(rows.map((row) => row.id)).size !== rows.length) throw new Error("Invalid or duplicate backup records.");
  }
  const quests = new Set(file.quests.map((row) => row.id));
  const entryKinds = new Map(file.entries.map((row) => [row.id, row.kind]));
  for (const row of file.quests) {
    const interval = row.repeat_days ?? 0;
    const days = row.weekdays ?? [];
    if (typeof row.title !== "string" || !row.title.trim() || row.title.length > 200 || !xp(row.xp) ||
      (row.due_on !== null && !day(row.due_on)) || (row.completed_on !== null && !day(row.completed_on)) ||
      !Number.isInteger(interval) || interval < 0 || interval > 365 ||
      !Array.isArray(days) || days.some((value) => !Number.isInteger(value) || value < 0 || value > 6) ||
      new Set(days).size !== days.length || (days.length && interval) || ((days.length || interval) && !row.due_on) ||
      (row.archived !== undefined && typeof row.archived !== "boolean") ||
      (row.priority !== undefined && !["Low", "Normal", "High", "Urgent"].includes(row.priority)) ||
      [row.category, row.notes].some((value, index) => value !== undefined && (typeof value !== "string" || value.length > (index ? 12000 : 80)))) throw new Error("Invalid quest in backup.");
  }
  const slots = new Set<string>();
  for (const row of file.questAwards) {
    const key = row.quest_id + "/" + row.slot;
    if (!quests.has(row.quest_id) || !day(row.day) || !xp(row.xp) || (row.slot !== "once" && row.slot !== row.day) ||
      typeof row.reversed !== "boolean" || (!row.reversed && slots.has(key))) throw new Error("Invalid or duplicate quest award.");
    if (!row.reversed) slots.add(key);
  }
  for (const row of file.entries) {
    if (typeof row.title !== "string" || typeof row.kind !== "string" || !day(row.day) || !row.fields || typeof row.fields !== "object" || Array.isArray(row.fields) ||
      Object.values(row.fields).some((value) => typeof value !== "string" && (typeof value !== "number" || !Number.isFinite(value)))) throw new Error("Invalid tracker record.");
    validateEntry(row);
    if (row.kind === "timer" && (!isId(row.fields.result) || !["work", "focus", "workouts"].includes(String(row.fields.target)) ||
      ["started", "carried"].some((key) => typeof row.fields[key] !== "number" || Number(row.fields[key]) < 0))) throw new Error("Invalid active timer.");
  }
  for (const kind of ["settings", "timer"]) if (file.entries.filter((row) => row.kind === kind).length > 1) throw new Error("Duplicate " + kind + " records.");
  const badgeCodes = file.entries.filter((row)=>row.kind==="achievements").map((row)=>row.fields.code);
  if (new Set(badgeCodes).size !== badgeCodes.length) throw new Error("Duplicate achievement records.");
  const sources = new Set<string>();
  for (const row of file.trackerAwards) {
    if (!isId(row.source_id) || !["workouts", "focus", "habitlogs", "coding", "milestones"].includes(row.kind) || !day(row.day) || !xp(row.xp) ||
      typeof row.reversed !== "boolean" || (!row.reversed && (sources.has(row.source_id) || entryKinds.get(row.source_id) !== row.kind))) throw new Error("Invalid or duplicate tracker award.");
    if (!row.reversed) sources.add(row.source_id);
  }
  return file;
}

export async function exportBackup(local: boolean): Promise<Backup> {
  if (local) {
    const quests = await readQuests(true);
    const questIds = new Set(quests.map((row) => row.id));
    const questAwards = (await readAwards(true)).filter((row) => questIds.has(row.quest_id));
    const stored: Entry[] = JSON.parse(localStorage.getItem(trackerStorageKey) ?? "[]");
    return validateBackup({ format: "AaronOS", version: 1, quests, questAwards,
      entries: stored.filter((row) => row.kind !== "internal-award"),
      trackerAwards: stored.filter((row) => row.kind === "internal-award").map((row) => ({
        id: row.id, source_id: row.fields.source, day: row.day, xp: row.fields.xp, kind: row.fields.sourceKind, reversed: row.fields.reversed === "yes",
      })),
    });
  }
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.rpc("export_aaronos_backup");
  if (error) throw new Error(error.message);
  return validateBackup(data);
}

export async function restoreBackup(local: boolean, input: unknown) {
  const backup = validateBackup(input);
  if (!local) {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.rpc("restore_aaronos_backup", { backup });
    if (error) throw new Error(error.message);
    return;
  }
  const rows: Entry[] = [...backup.entries, ...backup.trackerAwards.map((row): Entry => ({
    id: row.id, kind: "internal-award", title: row.kind, day: row.day,
    fields: { source: row.source_id, sourceKind: row.kind, xp: row.xp, reversed: row.reversed ? "yes" : "no" },
  }))];
  const updates = [[questStorageKey, backup.quests], [awardStorageKey, backup.questAwards], [trackerStorageKey, rows]] as const;
  const previous = updates.map(([key]) => localStorage.getItem(key));
  try {
    updates.forEach(([key]) => localStorage.removeItem(key));
    updates.forEach(([key, value]) => localStorage.setItem(key, JSON.stringify(value)));
  } catch (error) {
    updates.forEach(([key]) => localStorage.removeItem(key));
    updates.forEach(([key], index) => { if (previous[index] !== null) localStorage.setItem(key, previous[index]); });
    throw error;
  }
}
