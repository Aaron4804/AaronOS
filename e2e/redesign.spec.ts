import { expect, test } from "@playwright/test";

test("daily screens and in-session set logging", async ({ page }, info) => {
  for (const [name, route, heading] of [
    ["dashboard", "", "Command Center"], ["fitness", "/fitness", "Workout history"],
    ["nutrition", "/nutrition", "Food diary"], ["work", "/work", "Work dashboard"], ["quests", "/quests", "Quests"],
  ]) {
    await page.goto("/dashboard" + route);
    await expect(page.getByRole("heading", { name: heading, exact: true, level: 1 })).toBeVisible();
    await expect(page.getByText(/^Loading (records|quests)/)).toHaveCount(0);
    await page.screenshot({ path: info.outputPath(name + ".png"), fullPage: true });
  }
  await page.goto("/dashboard/fitness?kind=exercises&add=1");
  await page.getByLabel("Title", { exact: true }).fill("Squat");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Squat/ })).toBeVisible();
  await page.goto("/dashboard/fitness");
  await page.getByRole("button", { name: "Start workout", exact: true }).click();
  await page.getByLabel("Choose exercise").selectOption({ label: "Squat" });
  await page.getByRole("button", { name: "Add exercise", exact: true }).click();
  const weight = page.getByRole("spinbutton", { name: "Squat set 1 weight" });
  const reps = page.getByRole("spinbutton", { name: "Squat set 1 reps" });
  await weight.fill("60");
  await weight.blur();
  await expect(page.getByRole("checkbox", { name: "Complete set 1" })).toBeEnabled();
  await reps.fill("5");
  await reps.blur();
  await page.getByRole("checkbox", { name: "Complete set 1" }).check();
  await page.reload();
  await expect(weight).toHaveValue("60");
  await expect(reps).toHaveValue("5");
  await expect(page.getByRole("checkbox", { name: "Complete set 1" })).toBeChecked();
  await page.screenshot({ path: info.outputPath("active-workout.png"), fullPage: true });
  await page.getByRole("button", { name: "Finish and save" }).click();
  await expect(page.getByText("Active workout", { exact: true })).toHaveCount(0);
});
