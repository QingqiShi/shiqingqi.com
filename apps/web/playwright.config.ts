import { execFileSync } from "node:child_process";

import { defineConfig, devices } from "@playwright/test";

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/* Per-worktree dev-server port (3000 in the main checkout). The port is
 * resolved by the shared scripts/worktree-port.mjs helper, run as a
 * subprocess rather than imported because Playwright's config loader
 * cannot transpile a native ESM `.mjs` import. The relative path matches
 * the dev:next script in package.json (Playwright runs from apps/web).
 * `BASE_URL` still wins so CI and preview deployments are unaffected. */
const port = execFileSync("node", ["../../scripts/worktree-port.mjs"], {
  encoding: "utf8",
}).trim();
const baseURL = process.env.BASE_URL ?? `http://localhost:${port}`;

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./e2e",
  /* Drop the default `-{platform}` suffix — pixel-art screenshots are
   * deterministic enough that one baseline covers macOS dev and the
   * Linux CI container. `{snapshotDir}` must stay as the prefix:
   * `{testFileDir}` is empty for specs sitting directly under
   * `testDir`, so dropping it would leave a leading `/` that Playwright
   * resolves against the filesystem root. */
  snapshotPathTemplate:
    "{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{-projectName}{ext}",
  /* Increase timeout for slow navigation */
  timeout: 60000,
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry flaky tests */
  retries: 2,
  /* Run tests in parallel on CI for faster execution */
  workers: process.env.CI ? "50%" : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? "blob" : [["html", { open: "never" }]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL,

    /* Set browser locale to English to ensure consistent behavior in CI */
    locale: "en-US",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* Configure projects for major browsers - Chromium only for this project */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "pnpm build && pnpm start",
    url: baseURL,
    env: { PORT: port }, // next start binds this; reuses a running dev server if present
    reuseExistingServer: !process.env.CI,
    timeout: 300 * 1000, // 5 minutes for build + server to start
  },
});
