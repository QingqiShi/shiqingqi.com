import { execFileSync } from "node:child_process";
import { defineConfig, devices } from "@playwright/test";
import { emailOutbox } from "./e2e/email-outbox.ts";

const port = execFileSync(
  "node",
  ["../../scripts/get-worktree-port.mjs", "100"],
  { encoding: "utf8" },
).trim();
const databasePort = execFileSync(
  "node",
  ["../../scripts/get-worktree-port.mjs", "3733"],
  { encoding: "utf8" },
).trim();
const baseURL = process.env.BASE_URL ?? `http://localhost:${port}`;
// The build with a database in memory, where each user who signs up owns the sample trip.
const start = `pnpm exec tsx src/db/dev/run-with-local-trips.ts --memory --db-port ${databasePort} -- next start -p ${port}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [["line"]]
    : [["html", { open: "never" }], ["line"]],
  use: {
    baseURL,
    locale: "en-US",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // The service worker exists only in a production build. On CI a step
    // before this one builds the app, so this only starts it.
    command: process.env.CI ? start : `pnpm build && ${start}`,
    url: baseURL,
    env: { TRIPS_EMAIL_OUTBOX: emailOutbox(port) },
    reuseExistingServer: !process.env.CI,
    timeout: (process.env.CI ? 2 : 10) * 60 * 1000,
  },
});
