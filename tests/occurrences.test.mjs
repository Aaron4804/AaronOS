import test from "node:test";
import assert from "node:assert/strict";
import { changeAward, questSlot } from "../src/lib/quest-occurrences.ts";

test("weekly slots cross month boundaries", () => {
  assert.equal(questSlot("2026-01-28", 7, "2026-02-04"), "2026-02-04");
  assert.equal(questSlot("2026-01-28", 7, "2026-02-05"), null);
  assert.equal(questSlot("2026-01-28", 7, "2026-01-21"), null);
});

test("selected weekdays respect the schedule start date", () => {
  assert.equal(questSlot("2026-11-02", 0, "2026-11-04", [1, 3]), "2026-11-04");
  assert.equal(questSlot("2026-11-02", 0, "2026-11-03", [1, 3]), null);
  assert.equal(questSlot("2026-11-02", 0, "2026-10-28", [1, 3]), null);
});

test("retries preserve the original reward and undo affects one occurrence", () => {
  const a = { id: "a", quest_id: "q", day: "2026-02-04", slot: "2026-02-04", xp: 20 };
  const b = { ...a, id: "b", day: "2026-02-11", slot: "2026-02-11", xp: 40 };
  let awards = changeAward([], a, true);
  awards = changeAward(awards, { ...a, id: "retry", xp: 99 }, true);
  awards = changeAward(awards, b, true);
  awards = changeAward(awards, a, false);
  assert.deepEqual(awards.map(({ xp, reversed }) => [xp, reversed]), [[20, true], [40, false]]);
});
