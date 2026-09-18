import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "translation.spec.ts",
  webServer: {
    command: "npm.cmd run dev",
    url: "http://localhost:3001",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  use: {
    baseURL: "http://localhost:3001",
    channel: "chrome",
    headless: true,
  },
});
