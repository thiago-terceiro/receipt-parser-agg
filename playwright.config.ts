import { defineConfig, devices } from "@playwright/test";

const isolatedPort = Number(process.env.PLAYWRIGHT_PORT || 3107);
const explicitBaseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL?.trim();
const baseURL = explicitBaseUrl || `http://localhost:${isolatedPort}`;
const startCommand = process.env.CI
  ? `pnpm exec next start --port ${isolatedPort}`
  : `pnpm exec next dev --port ${isolatedPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: explicitBaseUrl
    ? undefined
    : {
        command: startCommand,
        url: `${baseURL}/en`,
        reuseExistingServer: false,
        timeout: 120 * 1000,
      },
});
