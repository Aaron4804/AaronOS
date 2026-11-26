export function kilograms(weight: number, unit: string) {
  return unit === "lb" ? weight * 0.45359237 : weight;
}

export function setVolume(weight: number, unit: string, reps: number, type: string) {
  return type === "assisted" ? 0 : kilograms(weight, unit) * reps;
}

export const nutrients = ["calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium"] as const;

export function scaleFood(food: Record<string, string | number>, quantity: number) {
  const serving = Number(food.serving);
  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(serving) || serving <= 0) {
    throw new Error("Quantity and base serving must be positive.");
  }
  return Object.fromEntries(nutrients.map((name) => [name, Math.round(Number(food[name] || 0) * quantity / serving * 10000) / 10000]));
}

export function elapsedSeconds(started: number, carried: number, now: number) {
  return carried + (started ? Math.max(0, Math.floor((now - started) / 1000)) : 0);
}

export function pomodoro(elapsed: number, focus: number, shortBreak: number, longBreak: number) {
  const focusSeconds = Math.max(1, Math.round(focus * 60));
  const shortSeconds = Math.max(1, Math.round(shortBreak * 60));
  const longSeconds = Math.max(1, Math.round(longBreak * 60));
  const cycle = 4 * focusSeconds + 3 * shortSeconds + longSeconds;
  const cycles = Math.floor(elapsed / cycle);
  let cursor = elapsed % cycle;
  let productive = cycles * 4 * focusSeconds;
  for (let block = 0; block < 4; block += 1) {
    if (cursor < focusSeconds) return { phase: "Focus", remaining: focusSeconds - cursor, productive: productive + cursor };
    cursor -= focusSeconds;
    productive += focusSeconds;
    const rest = block === 3 ? longSeconds : shortSeconds;
    if (cursor < rest) return { phase: block === 3 ? "Long break" : "Short break", remaining: rest - cursor, productive };
    cursor -= rest;
  }
  return { phase: "Focus", remaining: focusSeconds, productive };
}

export function cashFlow(rows: { direction: string; amount: number }[]) {
  const income = rows.filter((row) => row.direction === "Income").reduce((total, row) => total + Math.round(row.amount * 100), 0);
  const expenses = rows.filter((row) => row.direction === "Expense").reduce((total, row) => total + Math.round(row.amount * 100), 0);
  return { income: income / 100, expenses: expenses / 100, net: (income - expenses) / 100 };
}

export function accountBalance(account: string, opening: number, rows: { direction: string; amount: number; account: string; destination: string }[]) {
  const name = account.trim().toLowerCase();
  const amount = rows.reduce((balance, row) => {
    const value = Math.round(row.amount * 100);
    const source = row.account.trim().toLowerCase() === name;
    const destination = row.destination.trim().toLowerCase() === name;
    if (row.direction === "Transfer") return balance + (destination ? value : 0) - (source ? value : 0);
    if (!source) return balance;
    return balance + (row.direction === "Income" ? value : row.direction === "Expense" ? -value : 0);
  }, Math.round(opening * 100));
  return amount / 100;
}

export function nextBill(day: string, cycle: string) {
  const date = new Date(day + "T00:00:00Z");
  if (cycle === "Weekly") date.setUTCDate(date.getUTCDate() + 7);
  else {
    const desiredDay = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + (cycle === "Yearly" ? 12 : 1));
    const max = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(desiredDay, max));
  }
  return date.toISOString().slice(0, 10);
}

export function liftRecords(rows: { weight: number; unit: string; reps: number; type: string }[]) {
  const eligible = rows.filter((row) => row.type !== "assisted" && row.reps > 0 && row.weight > 0);
  return eligible.reduce((best, row) => {
    const kg = kilograms(row.weight, row.unit);
    return {
      heaviest: Math.max(best.heaviest, kg),
      estimatedMax: Math.max(best.estimatedMax, row.reps === 1 ? kg : kg * (1 + row.reps / 30)),
      setVolume: Math.max(best.setVolume, kg * row.reps),
    };
  }, { heaviest: 0, estimatedMax: 0, setVolume: 0 });
}

export function dailyStreak(days: string[], today: string) {
  const unique = new Set(days);
  let cursor = Date.parse(today);
  let count = 0;
  if (!Number.isFinite(cursor)) return count;
  if (!unique.has(today)) cursor -= 86_400_000;
  while (unique.has(new Date(cursor).toISOString().slice(0, 10))) {
    count += 1;
    cursor -= 86_400_000;
  }
  return count;
}

export function csvCell(value: string | number) {
  const text = String(value);
  const safe = typeof value === "string" && /^\s*[=+@\-\t\r]/.test(text) ? "'" + text : text;
  return '"' + safe.replaceAll('"', '""') + '"';
}

export function parseCsv(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  let closed = false;
  const pushCell = () => { row.push(value); value = ""; closed = false; };
  const pushRow = () => { pushCell(); if (row.some(Boolean)) rows.push(row); row = []; };
  for (let index = input.charCodeAt(0) === 0xfeff ? 1 : 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character !== '"') value += character;
      else if (input[index + 1] === '"') { value += '"'; index += 1; }
      else { quoted = false; closed = true; }
    } else if (character === ",") pushCell();
    else if (character === "\n" || character === "\r") {
      if (character === "\r" && input[index + 1] === "\n") index += 1;
      pushRow();
    } else if (closed || (character === '"' && value)) throw new Error("Malformed CSV quoting.");
    else if (character === '"') quoted = true;
    else value += character;
  }
  if (quoted) throw new Error("Unclosed CSV field.");
  pushRow();
  return rows;
}
