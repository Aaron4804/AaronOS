import { supabase } from "./supabase";
import { trackers } from "./tracker-definitions";
import { pomodoro } from "./tracker-math";
import { updateActivityCredit, type ActivityCredit } from "./activity-xp";

export type Entry = { id: string; kind: string; title: string; day: string; fields: Record<string, string | number> };
export const trackerStorageKey = "aaronos:trackers:v1";
const key = trackerStorageKey;

function client() {
  if (!supabase) throw new Error("Supabase configuration is missing.");
  return supabase;
}

function localRows(): Entry[] {
  return JSON.parse(localStorage.getItem(key) ?? "[]");
}

export async function entries(local: boolean): Promise<Entry[]> {
  if (local) return localRows().filter((row) => row.kind !== "internal-award");
  const result: Entry[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client().from("tracker_entries").select("id,kind,title,day,fields").order("id").range(offset, offset + 499);
    if (error) throw new Error(error.message);
    result.push(...data);
    if (data.length < 500) return result;
  }
}

export async function activityCredits(local: boolean): Promise<ActivityCredit[]> {
  if (local) return localRows().filter((row) => row.kind === "internal-award").map((row) => ({
    id: row.id, day: row.day, xp: Number(row.fields.xp), kind: String(row.fields.sourceKind), reversed: row.fields.reversed === "yes",
  }));
  const result: ActivityCredit[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client().from("tracker_xp_awards").select("id,day,xp,kind,reversed").order("id").range(offset, offset + 499);
    if (error) throw new Error(error.message);
    result.push(...data);
    if (data.length < 500) return result;
  }
}

export function validateEntry(row: Entry) {
  const timestamp = Date.parse(row.day);
  if (!row.title.trim() || row.title.length > 200 || !/^\d{4}-\d{2}-\d{2}$/.test(row.day) || !Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== row.day) throw new Error("Enter a title and valid date.");
  const config = trackers[row.kind];
  if (!config && row.kind !== "timer") throw new Error("Invalid tracker.");
  if (row.kind === "achievements" && !["first-quest","ten-quests","week-streak","first-workout"].includes(String(row.fields.code))) throw new Error("Invalid achievement code.");
  for (const field of config?.fields ?? []) {
    const value = row.fields[field.key];
    if (value === "" || value === undefined) {
      if (field.required) throw new Error(field.label + " is required.");
      continue;
    }
    if (field.type === "number" && (typeof value !== "number" || !Number.isFinite(value) || value < (field.min ?? 0))) throw new Error("Invalid " + field.label);
    if (field.options && !field.options.includes(String(value))) throw new Error("Invalid " + field.label);
    if (field.type === "date") {
      const timestamp = Date.parse(String(value));
      if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value) throw new Error("Invalid " + field.label);
    }
  }
  if (row.kind === "settings" && row.fields.timezone) {
    try { new Intl.DateTimeFormat("en", { timeZone: String(row.fields.timezone) }); }
    catch { throw new Error("Use an IANA timezone such as Asia/Kolkata."); }
  }
  if (row.kind === "settings" && row.fields.currency && !/^[A-Z]{3}$/.test(String(row.fields.currency))) throw new Error("Use a three-letter currency code, such as INR.");
  if (["events", "plans"].includes(row.kind) && row.fields.repeat && (!Number.isInteger(row.fields.repeat) || Number(row.fields.repeat) > 365)) throw new Error("Use a whole repeat interval between 1 and 365 days.");
  if (row.kind === "events" && row.fields.until && String(row.fields.until) < row.day) throw new Error("Repeat end must be on or after the start date.");
  if (row.kind === "events" && row.fields.weekdays &&
      (row.fields.repeat || !/^\s*(sun|mon|tue|wed|thu|fri|sat)(\s*,\s*(sun|mon|tue|wed|thu|fri|sat))*\s*$/i.test(String(row.fields.weekdays)))) {
    throw new Error("Use weekday abbreviations separated by commas, or a repeat interval.");
  }
  if (row.kind === "wellness" && row.fields.sleep && row.fields.wake && row.fields.wake <= row.fields.sleep) throw new Error("Wake time must be after sleep start.");
  if (row.kind === "work" && Number(row.fields.breaks || 0) > Number(row.fields.minutes || 0)) throw new Error("Break time cannot exceed session duration.");
  if (row.kind === "projects" && Number(row.fields.progress || 0) > 100) throw new Error("Progress must be between 0 and 100.");
  if (row.kind === "adjustments" && (!Number.isInteger(row.fields.delta) || Number(row.fields.delta) > 100000 || !String(row.fields.notes || "").trim())) throw new Error("Enter a whole XP adjustment of up to 100,000 and a reason.");
  if (row.kind === "finance" && !["Income", "Expense", "Transfer"].includes(String(row.fields.direction))) throw new Error("Choose a transaction kind.");
  if (row.kind === "finance" && row.fields.direction === "Transfer") {
    const source = String(row.fields.account || "").trim().toLowerCase();
    const destination = String(row.fields.destination || "").trim().toLowerCase();
    if (!source || !destination || source === destination) throw new Error("Transfers need two different accounts.");
  }
  if (row.kind === "habits" && row.fields.frequency === "Selected weekdays" &&
      !/^\s*(sun|mon|tue|wed|thu|fri|sat)(\s*,\s*(sun|mon|tue|wed|thu|fri|sat))*\s*$/i.test(String(row.fields.weekdays || ""))) {
    throw new Error("Enter weekday abbreviations separated by commas.");
  }
}

export async function putEntry(local: boolean, row: Entry) {
  validateEntry(row);
  if (local) {
    const current = localRows();
    if (row.kind === "timer" && current.some((old) => old.kind === "timer" && old.id !== row.id)) throw new Error("Finish the other timer first.");
    const others = current.filter((old) => old.id !== row.id && !(row.kind === "settings" && old.kind === row.kind));
    localStorage.setItem(key, JSON.stringify(updateActivityCredit([...others, row], row)));
    return;
  }
  const { error } = await client().from("tracker_entries").upsert(row);
  if (error) throw new Error(error.message);
}

export async function deleteEntry(local: boolean, id: string) {
  if (local) {
    const current = localRows();
    const deleted = current.find((row) => row.id === id);
    const children = current.filter((row) =>
      (deleted?.kind === "workouts" && row.kind === "sets" && row.fields.workout === id) ||
      (deleted?.kind === "plans" && row.kind === "templates" && row.fields.plan === id) ||
      (deleted?.kind === "recipes" && row.kind === "ingredients" && row.fields.recipe === id));
    const others = current.filter((row) => row.id !== id && !children.includes(row));
    localStorage.setItem(key, JSON.stringify(deleted ? updateActivityCredit(others, deleted, true) : others));
    return;
  }
  const { error } = await client().from("tracker_entries").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function finishTimer(local: boolean, timer: Entry, seconds: number) {
  const kind = String(timer.fields.target);
  if (!["work", "focus", "workouts"].includes(kind)) throw new Error("Invalid timer type.");
  const productive = kind === "focus" && timer.fields.mode === "pomodoro"
    ? pomodoro(seconds, Number(timer.fields.focus), Number(timer.fields.shortBreak), Number(timer.fields.longBreak)).productive : seconds;
  const finished: Entry = { id: String(timer.fields.result), kind, title: timer.title, day: timer.day, fields: { minutes: Math.round(productive / 60 * 100) / 100, ...(timer.fields.project ? { project: timer.fields.project } : {}) } };
  if (local) {
    const current = localRows();
    if (!current.some((row) => row.id === timer.id)) return;
    const target = current.find((row) => row.id === finished.id && row.kind === "workouts" && kind === "workouts");
    if (!target && current.some((row) => row.id === finished.id)) throw new Error("Timer destination already exists.");
    const saved = target ? { ...target, fields: { ...target.fields, ...finished.fields, status: "Completed" } } : finished;
    localStorage.setItem(key, JSON.stringify(updateActivityCredit([...current.filter((row) => row.id !== timer.id && row.id !== finished.id), saved], saved)));
    return;
  }
  const { error } = await client().rpc("finish_tracker_timer", { timer_id: timer.id });
  if (error) throw new Error(error.message);
}

export async function importEntries(local: boolean, input: unknown) {
  if (!Array.isArray(input) || input.length > 5000) throw new Error("Choose an AaronOS tracker export with up to 5,000 records.");
  const seen = new Set<string>();
  for (const row of input) {
    if (!row || typeof row !== "object" || typeof row.id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.id) ||
      typeof row.kind !== "string" || !Object.hasOwn(trackers, row.kind) || typeof row.title !== "string" ||
      typeof row.day !== "string" || !row.fields || typeof row.fields !== "object" || Array.isArray(row.fields) ||
      seen.has(row.id) || Object.values(row.fields).some((value) => typeof value !== "string" && typeof value !== "number")) {
      throw new Error("Backup contains an invalid or duplicate record.");
    }
    validateEntry(row);
    seen.add(row.id);
  }
  const incoming = (input as Entry[]).map(({ id, kind, title, day, fields }) => ({ id, kind, title, day, fields }));
  if (incoming.filter((row) => row.kind === "settings").length > 1) throw new Error("Backup contains multiple settings records.");
  const existing = await entries(local);
  const records = incoming.filter((row) => !existing.some((current) => current.id === row.id || (row.kind === "settings" && current.kind === "settings")));
  if (!records.length) return;
  if (local) {
    const combined = [...localRows(), ...records];
    localStorage.setItem(key, JSON.stringify(records.reduce((all, record) => updateActivityCredit(all, record), combined)));
    return;
  }
  const { error } = await client().from("tracker_entries").upsert(records, { ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}
