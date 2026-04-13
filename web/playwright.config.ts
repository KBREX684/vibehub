import { defineConfig, devices } from "@playwright/test";

const port = Number.parseInt(process.env.PORT?.trim() || "3000", 10);
const baseURL = process.env.PLAYWRIGHT_BASE_URL?.trim() || `http://127.0.0.1:${port}`;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // CI runs `next build` first; locally `next dev` avoids requiring a production build.
    command: isCI ? "npm run start" : `npm run dev -- -p ${port}`,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    env: {
      ...process.env,
      PORT: String(port),
      USE_MOCK_DATA: process.env.USE_MOCK_DATA ?? "true",
      NODE_ENV: isCI ? "production" : "development",
      SESSION_SECRET: process.env.SESSION_SECRET ?? "playwright-session-secret",
      ...(isCI ? { E2E_ALLOW_DEMO_LOGIN: process.env.E2E_ALLOW_DEMO_LOGIN ?? "true" } : {}),
    },
  },
});
