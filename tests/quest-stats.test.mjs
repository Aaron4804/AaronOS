import test from "node:test";
import assert from "node:assert/strict";
import { dayKey, summarize } from "../src/lib/quest-stats.ts";

test("Indian midnight changes the calendar date", () => {
  assert.equal(dayKey(new Date("2026-11-25T18:29:59Z")), "2026-11-25");
  assert.equal(dayKey(new Date("2026-11-25T18:30:00Z")), "2026-11-26");
});

test("completion credits XP once per record and undo removes credit", () => {
  const quest = { id: "one", title: "Study", xp: 100, due_on: null, completed_on: "2026-11-25" };
  assert.deepEqual(summarize([quest], "2026-11-25"), {
    total: 100, level: 2, todayXp: 100, completedToday: 1, streak: 1, longest: 1,
  });
  assert.equal(summarize([{ ...quest, completed_on: null }], "2026-11-25").total, 0);
});

test("multiple completions count as one streak day", () => {
  const quests = ["2026-11-23", "2026-11-24", "2026-11-24"].map((completed_on, id) => ({
    id: String(id), title: "Study", xp: 20, due_on: null, completed_on,
  }));
  assert.equal(summarize(quests, "2026-11-25").streak, 2);
  assert.equal(summarize(quests, "2026-11-26").streak, 0);
  assert.equal(summarize(quests, "2026-11-26").longest, 2);
});
