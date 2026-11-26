import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://127.0.0.1:3100", channel: "msedge" },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    env: { AARONOS_LOCAL_MODE: "true" },
    url: "http://127.0.0.1:3100/dashboard",
    reuseExistingServer: true,
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
});
