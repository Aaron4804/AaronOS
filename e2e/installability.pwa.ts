import { expect, test } from "@playwright/test";

test("production PWA installs its public cache and provides an offline navigation fallback", async ({ page, context, request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/dashboard");
  for (const { src } of manifest.icons) expect((await request.get(src)).headers()["content-type"]).toContain("image/png");
  await page.goto("/auth/login");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  const cache = await page.evaluate(async () => (await (await caches.open("aaronos-public-v1")).keys()).map((req) => new URL(req.url).pathname).sort());
  expect(cache).toEqual(["/offline.html","/pwa-icon/180","/pwa-icon/192","/pwa-icon/512"]);
  await context.setOffline(true);
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "AaronOS is offline" })).toBeVisible();
  await context.setOffline(false);
});
