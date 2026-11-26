import type { QuestRecord } from "./quest-repository";

export function dayKey(date: Date, timeZone = "Asia/Kolkata") {
  const parts = new Intl.DateTimeFormat("en", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

const dayNumber = (date: string) => Date.parse(date + "T00:00:00Z") / 86_400_000;

export function summarize(quests: QuestRecord[], today: string, xpPerLevel = 100) {
  const completed = quests.filter((quest) => quest.completed_on);
  const current = completed.filter((quest) => quest.completed_on === today);
  const total = completed.reduce((sum, quest) => sum + quest.xp, 0);
  const days = [...new Set(completed.map((quest) => dayNumber(quest.completed_on!)))].sort((a, b) => a - b);
  let run = 0;
  let longest = 0;
  days.forEach((day, index) => {
    run = day === days[index - 1] + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  });
  const last = days.at(-1);
  const streak = last === dayNumber(today) || last === dayNumber(today) - 1 ? run : 0;
  return { total, level: Math.floor(total / Math.max(1, xpPerLevel)) + 1, todayXp: current.reduce((sum, quest) => sum + quest.xp, 0), completedToday: current.length, streak, longest };
}

export function recentActivity(quests: QuestRecord[], today: string) {
  if (!today) return [];
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date((dayNumber(today) - 6 + index) * 86_400_000).toISOString().slice(0, 10);
    const xp = quests.reduce((total, quest) => total + (quest.completed_on === day ? quest.xp : 0), 0);
    return { day, xp };
  });
}
