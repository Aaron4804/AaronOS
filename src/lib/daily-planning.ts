import type { Entry } from "./tracker-repository";
import { questSlot } from "./quest-occurrences";

export function plansForDay(rows: Entry[], day: string) {
  if (!day) return [];
  const identifiers = new Set(rows.filter((row) => row.kind === "plans").flatMap((row) => [row.title, String(row.fields.split || "")]).map((label) => label.trim().toLowerCase()).filter(Boolean));
  return rows.filter((row) => {
    if (row.kind !== "plans") return false;
    const rotation = String(row.fields.rotation || "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
    const offset = (Date.parse(day) - Date.parse(row.day)) / 86400000;
    if (rotation.length) {
      if (offset < 0 || !Number.isInteger(offset)) return false;
      const slot = rotation[offset % rotation.length];
      if (["rest","off"].includes(slot)) return false;
      return !rotation.some((label)=>identifiers.has(label)) || [row.title,String(row.fields.split || "")].some((label)=>label.trim().toLowerCase()===slot);
    }
    return row.day === day || Boolean(row.fields.repeat && questSlot(row.day, Number(row.fields.repeat), day));
  });
}

export function nutritionTarget(settings: Entry | undefined, nutrient: string, training: boolean) {
  if (!settings) return 0;
  return Number(settings.fields[(training ? "training_" : "rest_") + nutrient] || settings.fields[nutrient] || 0);
}
