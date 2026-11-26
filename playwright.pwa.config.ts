import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.pwa.ts",
  outputDir: "./test-results/installation",
  use: { channel: "msedge", baseURL: "http://127.0.0.1:3115" },
});
