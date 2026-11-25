import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

/**
 * Critical-journey specs run on every browser/device profile (#747).
 * `smoke.spec.ts` is intentionally excluded: it has its own project so the
 * staging workflow (#746) can target a deployed URL with a small, fast suite.
 */
const REGULAR_TEST_IGNORE = /smoke\.spec\.ts/;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    // The app registers a service worker; page.route cannot see requests it
    // makes, which would let real backend calls leak into the journeys.
    serviceWorkers: "block",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: REGULAR_TEST_IGNORE,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      testIgnore: REGULAR_TEST_IGNORE,
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      testIgnore: REGULAR_TEST_IGNORE,
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "mobile-chrome",
      testIgnore: REGULAR_TEST_IGNORE,
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "mobile-safari",
      testIgnore: REGULAR_TEST_IGNORE,
      use: { ...devices["iPhone 14"] },
    },
    {
      name: "smoke",
      testMatch: /smoke\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Staging runs set PLAYWRIGHT_BASE_URL and must not start a local server.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: process.env.CI ? "npm run start" : "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
