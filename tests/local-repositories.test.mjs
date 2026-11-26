import { registerHooks } from "node:module";
import test from "node:test";
import assert from "node:assert/strict";

const hook = registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.includes("/src/lib/") && /^\.\/[\w-]+$/.test(specifier)) {
      return next(specifier + ".ts", context);
    }
    return next(specifier, context);
  },
});
const quests = await import("../src/lib/quest-repository.ts");
const trackers = await import("../src/lib/tracker-repository.ts");
const { scaleFood } = await import("../src/lib/tracker-math.ts");
const { review, workoutHistory } = await import("../src/lib/reviews.ts");
const { plansForDay, nutritionTarget } = await import("../src/lib/daily-planning.ts");
const { categoryThreshold, achievementId } = await import("../src/lib/progression.ts");
hook.deregister();

test("rotation chooses its named split, skips rest and uses scoped nutrition targets", () => {
  const plan=(title)=>({id:title,kind:"plans",title,day:"2026-11-01",fields:{rotation:"Push, Pull, Rest"}});
  const rows=[plan("Push"),plan("Pull")];
  assert.deepEqual(plansForDay(rows,"2026-11-02").map(row=>row.title),["Pull"]);
  assert.deepEqual(plansForDay(rows,"2026-11-03"),[]);
  assert.equal(nutritionTarget({fields:{calories:1900,training_calories:2200}},"calories",true),2200);
  assert.equal(nutritionTarget({fields:{calories:1900,training_calories:2200}},"calories",false),1900);
});

test("category XP overrides are explicit and badge IDs are stable per owner", async () => {
  assert.equal(categoryThreshold("Career=250\nCoding=75","coding",100),75);
  assert.equal(categoryThreshold("Career=0","Career",100),100);
  assert.equal(await achievementId("owner","first-quest"),await achievementId("owner","first-quest"));
  assert.notEqual(await achievementId("owner","first-quest"),await achievementId("other","first-quest"));
});

const state = new Map();
const storage = { getItem: (key) => state.get(key) ?? null, setItem: (key, value) => state.set(key, value) };
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
globalThis.window = { localStorage: storage };

test("local recurring quest CRUD preserves rewards through edit and undo", async () => {
  const q = { id: crypto.randomUUID(), title: "Read", xp: 20, repeat_days: 1, due_on: "2026-11-01", completed_on: null };
  await quests.saveQuest(true, q);
  await quests.setCompletion(true, q, "2026-11-01", true);
  await quests.saveQuest(true, { ...q, xp: 99 });
  const [updated] = await quests.readQuests(true);
  await quests.setCompletion(true, updated, "2026-11-01", true);
  await quests.setCompletion(true, updated, "2026-11-02", true);
  await quests.setCompletion(true, q, "2026-11-01", false);
  assert.deepEqual((await quests.readAwards(true)).map(({ xp, reversed }) => [xp, reversed]), [[20, true], [99, false]]);
  await assert.rejects(quests.saveQuest(true, { ...updated, repeat_days: 7 }), /preserve/);
  await quests.removeQuest(true, q.id);
  assert.equal((await quests.readQuests(true)).length, 0);
});

test("tracker backup validates all rows before writing and retains existing rows", async () => {
  const row = { id: crypto.randomUUID(), kind: "foods", title: "Yogurt", day: "2026-11-01", fields: { serving: 100, protein: 10 } };
  await assert.rejects(trackers.importEntries(true, [row, { ...row, id: "bad" }]), /invalid/);
  assert.equal((await trackers.entries(true)).length, 0);
  await trackers.importEntries(true, [row]);
  await trackers.importEntries(true, [{ ...row, title: "Replacement" }]);
  assert.deepEqual(await trackers.entries(true), [row]);
  await trackers.deleteEntry(true, row.id);
  assert.equal((await trackers.entries(true)).length, 0);
});

test("finishing a restored local timer saves one session and clears the timer", async () => {
  const timer = { id: crypto.randomUUID(), kind: "timer", title: "Writing", day: "2026-11-01", fields: { target: "work", result: crypto.randomUUID(), started: 0, carried: 90 } };
  await trackers.putEntry(true, timer);
  await assert.rejects(trackers.putEntry(true, { ...timer, id: crypto.randomUUID() }), /Finish the other timer/);
  const [restored] = await trackers.entries(true);
  await trackers.finishTimer(true, restored, 90);
  await trackers.finishTimer(true, restored, 90);
  const [session, extra] = await trackers.entries(true);
  assert.equal(extra, undefined);
  assert.equal(session.kind, "work");
  assert.equal(session.fields.minutes, 1.5);
});

test("finishing a workout timer updates its existing workout and preserves plan data", async () => {
  const workout = { id: crypto.randomUUID(), kind: "workouts", title: "Lift", day: "2026-11-01", fields: { status: "Planned", notes: "Lower body" } };
  const timer = { id: crypto.randomUUID(), kind: "timer", title: "Lift", day: workout.day, fields: { target: "workouts", result: workout.id, started: 0, carried: 1800 } };
  await trackers.putEntry(true, workout);
  await trackers.putEntry(true, timer);
  await trackers.finishTimer(true, timer, 1800);
  const updated = (await trackers.entries(true)).find((row) => row.id === workout.id);
  assert.deepEqual(updated.fields, { status: "Completed", notes: "Lower body", minutes: 30 });
});

test("activity rewards snapshot the amount and reverse when eligibility is undone", async () => {
  const coding = { id: crypto.randomUUID(), kind: "coding", title: "Solve one", day: "2026-11-01", fields: { solved: "Yes" } };
  await trackers.putEntry(true, coding);
  await trackers.putEntry(true, { ...coding, title: "Edited" });
  assert.equal((await trackers.activityCredits(true)).filter((row) => row.kind === "coding" && !row.reversed).length, 1);
  await trackers.putEntry(true, { ...coding, fields: { solved: "No" } });
  assert.deepEqual((await trackers.activityCredits(true)).filter((row) => row.kind === "coding").map(({ xp, reversed }) => [xp, reversed]), [[30, true]]);
});

test("editing food macros never changes historical meal totals or overrides", async () => {
  const food = { id: crypto.randomUUID(), kind: "foods", title: "Food", day: "2026-11-04", fields: { serving: 100, protein: 26, calories: 180 } };
  const meal = { id: crypto.randomUUID(), kind: "meals", title: "Meal", day: food.day, fields: { food: food.id, quantity: 50, ...scaleFood(food.fields, 50) } };
  await trackers.putEntry(true, food);
  await trackers.putEntry(true, meal);
  await trackers.putEntry(true, { ...food, fields: { ...food.fields, protein: 28 } });
  const saved = (await trackers.entries(true)).find((row) => row.id === meal.id);
  assert.equal(saved.fields.protein, 13);
  await trackers.putEntry(true, { ...saved, fields: { ...saved.fields, calories: 85 } });
  const meals = (await trackers.entries(true)).filter((row) => row.kind === "meals" && row.day === food.day);
  assert.equal(meals.reduce((sum, row) => sum + row.fields.calories, 0), 85);
});

test("review averages measured days and compares logged nutrition with targets", () => {
  const row = (kind, day, fields) => ({ id: crypto.randomUUID(), kind, day, title: kind, fields });
  const rows = [
    row("measurements", "2026-11-03", { weight: 70, unit: "kg" }),
    row("measurements", "2026-11-03", { weight: 72, unit: "kg" }),
    row("measurements", "2026-11-05", { weight: 75, unit: "kg" }),
    row("meals", "2026-11-03", { protein: 60 }),
    row("meals", "2026-11-03", { protein: 35 }),
    row("meals", "2026-11-05", { protein: 80 }),
  ];
  const result = review(rows, "2026-11-01", "2026-11-07", row("settings", "2026-11-01", { protein: 100 }));
  assert.equal(result.averageWeight, 73);
  assert.equal(result.weight[1].rolling, 73);
  assert.deepEqual(result.nutrition.find((row) => row.field === "protein"), { field: "protein", target: 100, average: 87.5, days: 2, close: 1 });
});

test("strength progression filters planned sets and uses parent workout date", () => {
  const workout = { id: "workout", title: "Strength", day: "2026-11-02", kind: "workouts", fields: { status: "Completed" } };
  const set = { id: "set", title: "Set", day: "2026-11-03", kind: "sets", fields: { workout: workout.id, exercise: "squat", status: "Completed", reps: 5, weight: 60, unit: "kg" } };
  const [entry] = workoutHistory([workout, set, { ...set, id: "planned", fields: { ...set.fields, weight: 200, status: "Planned" } }], "squat");
  assert.equal(entry.workout.day, workout.day);
  assert.equal(entry.volume, 300);
  assert.equal(entry.heaviest, 60);
});
