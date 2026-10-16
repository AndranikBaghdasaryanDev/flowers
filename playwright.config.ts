import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a running app (dev or `next start`) with the demo seed
 * and an owner account:
 *   E2E_BASE_URL=http://localhost:3100 E2E_OWNER_EMAIL=... E2E_OWNER_PASSWORD=... npm run test:e2e
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /mobile.spec.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec\.ts/ },
  ],
});
