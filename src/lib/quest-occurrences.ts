export type Award = { id: string; quest_id: string; slot: string; day: string; xp: number; reversed: boolean };

export function questSlot(start: string | null, interval: number, day: string, weekdays: number[] = []) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(day))) return null;
  if (weekdays.length) return start && day >= start && weekdays.includes(new Date(day).getUTCDay()) ? day : null;
  if (!interval) return "once";
  if (!start) return null;
  const elapsed = (Date.parse(day) - Date.parse(start)) / 86_400_000;
  return elapsed >= 0 && elapsed % interval === 0 ? day : null;
}

export function changeAward(awards: Award[], entry: Omit<Award, "reversed">, complete: boolean) {
  const active = awards.find((award) => award.quest_id === entry.quest_id && award.slot === entry.slot && !award.reversed);
  if (complete) return active ? awards : [...awards, { ...entry, reversed: false }];
  return active ? awards.map((award) => award.id === active.id ? { ...award, reversed: true } : award) : awards;
}
