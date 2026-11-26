import test from "node:test";
import assert from "node:assert/strict";
import { accountBalance, cashFlow, csvCell, dailyStreak, elapsedSeconds, kilograms, liftRecords, nextBill, parseCsv, pomodoro, scaleFood, setVolume } from "../src/lib/tracker-math.ts";

test("nutrition scales package values and snapshots remain independent", () => {
  const food = { serving: 100, protein: 26, calories: 175 };
  const logged = scaleFood(food, 50);
  assert.equal(logged.protein, 13);
  assert.equal(logged.calories, 87.5);
  food.protein = 30;
  assert.equal(logged.protein, 13);
  assert.throws(() => scaleFood({ serving: 0 }, 50));
});

test("workout volumes convert pounds and omit assisted loads", () => {
  assert.equal(setVolume(100, "lb", 5, "working"), kilograms(100, "lb") * 5);
  assert.equal(setVolume(100, "kg", 5, "assisted"), 0);
});

test("timers restore elapsed time from persisted timestamps", () => {
  assert.equal(elapsedSeconds(1000, 17, 15000), 31);
  assert.equal(elapsedSeconds(0, 31, 25000), 31);
});

test("finance totals exclude transfers", () => {
  assert.deepEqual(cashFlow([{ direction: "Income", amount: 12.67 }, { direction: "Expense", amount: 2.21 }, { direction: "Transfer", amount: 10 }]), { income: 12.67, expenses: 2.21, net: 10.46 });
});

test("personal records compare normalized weight and use actual one-rep lifts", () => {
  const records = liftRecords([{ weight: 220, unit: "lb", reps: 1, type: "working" }, { weight: 90, unit: "kg", reps: 3, type: "drop set" }, { weight: 200, unit: "kg", reps: 5, type: "assisted" }]);
  assert.equal(records.heaviest, kilograms(220, "lb"));
  assert.ok(Math.abs(records.estimatedMax - kilograms(220, "lb")) < 0.001);
  assert.equal(records.setVolume, 270);
});

test("streaks count distinct consecutive days and CSV escapes formulas", () => {
  assert.equal(dailyStreak(["2026-01-31", "2026-02-01", "2026-02-01"], "2026-02-02"), 2);
  assert.equal(dailyStreak(["2026-02-01"], "2026-02-03"), 0);
  assert.equal(csvCell("=1+1"), '"\'=1+1"');
});

test("CSV preserves quoted commas, quotes and newlines", () => {
  assert.deepEqual(parseCsv('Date,Title\r\n2026-11-01,"food, ""coffee""\nwith milk"\r\n'), [["Date", "Title"], ["2026-11-01", 'food, "coffee"\nwith milk']]);
  assert.throws(() => parseCsv('"unfinished'));
});

test("Pomodoro crosses breaks and credits productive time only", () => {
  assert.deepEqual(pomodoro(1550, 25, 5, 15), { phase: "Short break", remaining: 250, productive: 1500 });
  assert.deepEqual(pomodoro(6900, 25, 5, 15), { phase: "Long break", remaining: 900, productive: 6000 });
  assert.equal(pomodoro(8100, 25, 5, 15).productive, 6300);
});

test("transfers change account balances and subscription dates clamp to month end", () => {
  const transfer = { direction: "Transfer", amount: 12.5, account: "Cash", destination: "Bank" };
  assert.equal(accountBalance("Cash", 20, [transfer]), 7.5);
  assert.equal(accountBalance("Bank", 20, [transfer]), 32.5);
  assert.equal(nextBill("2026-01-31", "Monthly"), "2026-02-28");
});
