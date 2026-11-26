import { supabase } from "./supabase";
import { changeAward, questSlot, type Award } from "./quest-occurrences";

export type QuestRecord = {
  id: string;
  title: string;
  xp: number;
  due_on: string | null;
  completed_on: string | null;
  repeat_days?: number;
  archived?: boolean;
  category?: string;
  priority?: string;
  notes?: string;
  weekdays?: number[];
};

export const questStorageKey = "aaronos:quests:v1";
export const awardStorageKey = "aaronos:quest-awards:v1";
const key = questStorageKey;
const ledgerKey = awardStorageKey;
function readLocal(): QuestRecord[] {
  return JSON.parse(window.localStorage.getItem(key) ?? "[]");
}

function remote() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

export async function readQuests(local: boolean): Promise<QuestRecord[]> {
  if (local) return readLocal();
  const result: QuestRecord[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await remote().from("quests").select("id,title,xp,due_on,completed_on,repeat_days,archived,category,priority,notes,weekdays").order("created_at").order("id").range(offset, offset + 499);
    if (error) throw new Error(error.message);
    result.push(...data);
    if (data.length < 500) return result;
  }
}

export async function saveQuest(local: boolean, quest: QuestRecord) {
  if (!quest.title.trim() || quest.title.length > 200 || !Number.isInteger(quest.xp) || quest.xp < 0 || quest.xp > 100000) {
    throw new Error("Enter a quest title and a whole XP amount between 0 and 100,000.");
  }
  const interval = quest.repeat_days ?? 0;
  const weekdays = [...new Set(quest.weekdays ?? [])].sort();
  if (!Number.isInteger(interval) || interval < 0 || interval > 365 || ((interval > 0 || weekdays.length) && !quest.due_on) ||
      weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6) || (interval && weekdays.length)) {
    throw new Error("Recurring quests require a start date and an interval of 1–365 days.");
  }
  if (local) {
    const current = readLocal();
    const previous = current.find((record) => record.id === quest.id);
    if (previous && ((previous.repeat_days ?? 0) !== interval || (JSON.stringify([...(previous.weekdays ?? [])].sort()) !== JSON.stringify(weekdays)) ||
        ((interval || weekdays.length) && previous.due_on !== quest.due_on)) &&
        (await readAwards(true)).some((award) => award.quest_id === quest.id)) {
      throw new Error("Archive this quest and create a new schedule to preserve its completion history.");
    }
    const next = current.some(({ id }) => id === quest.id)
      ? current.map((record) => record.id === quest.id ? quest : record)
      : [...current, quest];
    window.localStorage.setItem(key, JSON.stringify(next));
    return;
  }
  const { id, title, xp, due_on, archived, category, priority, notes } = quest;
  const { error } = await remote().from("quests").upsert({ id, title, xp, due_on, repeat_days: interval, archived: archived ?? false, category: category ?? "", priority: priority ?? "Normal", notes: notes ?? "", weekdays });
  if (error) throw new Error(error.message);
}

export async function readAwards(local: boolean): Promise<Award[]> {
  if (local) return readLocalAwards();
  const result: Award[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await remote().from("quest_xp_awards").select("id,quest_id,slot,day,xp,reversed").order("created_at").order("id").range(offset, offset + 499);
    if (error) throw new Error(error.message);
    result.push(...data);
    if (data.length < 500) return result;
  }
}

function readLocalAwards(): Award[] {
  const saved = window.localStorage.getItem(ledgerKey);
  if (saved) return JSON.parse(saved);
  const migrated = readLocal().flatMap((quest): Award[] => quest.completed_on
    ? [{ id: quest.id, quest_id: quest.id, slot: "once", day: quest.completed_on, xp: quest.xp, reversed: false }] : []);
  window.localStorage.setItem(ledgerKey, JSON.stringify(migrated));
  return migrated;
}

export async function setCompletion(local: boolean, quest: QuestRecord, day: string, complete: boolean) {
  if (!local) {
    const { error } = await remote().rpc("set_quest_completion", { p_quest: quest.id, p_day: day, p_complete: complete });
    if (error) throw new Error(error.message);
    return;
  }
  const apply = () => {
    const latest = readLocal().find((record) => record.id === quest.id);
    const slot = latest && questSlot(latest.due_on, latest.repeat_days ?? 0, day, latest.weekdays);
    if (!slot || !latest || latest.archived) throw new Error("Quest is outside its active schedule.");
    window.localStorage.setItem(ledgerKey, JSON.stringify(changeAward(readLocalAwards(), {
      id: crypto.randomUUID(), quest_id: latest.id, slot, day, xp: latest.xp,
    }, complete)));
  };
  if (globalThis.navigator?.locks) await navigator.locks.request(ledgerKey, apply);
  else apply();
}

export async function removeQuest(local: boolean, id: string) {
  if (local) {
    await readAwards(true);
    window.localStorage.setItem(key, JSON.stringify(readLocal().filter((quest) => quest.id !== id)));
    return;
  }
  const { error } = await remote().from("quests").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
