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
 * resolved by the shared scripts/get-worktree-port.mjs helper, run as a
 * subprocess rather than imported because Playwright's config loader
 * cannot transpile a native ESM `.mjs` import. The relative path matches
 * the dev:next script in package.json (Playwright runs from apps/web).
 * `BASE_URL` still wins so CI and preview deployments are unaffected. */
const port = execFileSync("node", ["../../scripts/get-worktree-port.mjs"], {
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
  /* Reporter to use. See https://playwright.dev/docs/test-reporters.
   * web-server-error-reporter fails the run if web-server-with-error-log.mjs
   * caught a server error, alongside whichever reporter renders results. */
  reporter: [
    process.env.CI ? ["blob"] : ["html", { open: "never" }],
    // html and blob write only to disk, so without a terminal reporter a
    // global error (for example a webServer startup failure) shows nowhere
    // and the run fails silently.
    ["line"],
    // The timestamp must come from config evaluation, which happens before
    // the webServer starts. The reporter's own onBegin fires after the
    // server is ready, so it would miss errors logged during startup.
    ["./e2e/web-server-error-reporter.ts", { configLoadedAt: Date.now() }],
  ],
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
    // On CI the app is built once in a dedicated job and its output is
    // downloaded into each shard, so we only start it here. Locally we still
    // build on demand (or reuse a running dev server via reuseExistingServer).
    // The wrapper starts the real `pnpm start` and also catches server
    // errors for web-server-error-reporter.ts to fail the run on.
    command: `${process.env.CI ? "" : "pnpm build && "}node e2e/web-server-with-error-log.mjs`,
    url: baseURL,
    env: {
      PORT: port, // next start binds this; reuses a running dev server if present
      // Exercises the real posthog.init() path (see src/utils/posthog/init-post-hog.ts)
      // without sending anything: the host never resolves, so nothing leaves
      // the machine, but a crash in init still fails the suite. NEXT_PUBLIC_*
      // is inlined at build time, so these only take effect via the local
      // `pnpm build` branch above — on CI the prebuilt artifact already
      // carries the same placeholders from playwright.yml's build step.
      // Playwright merges this object onto process.env rather than replacing
      // it, so CI's TMDB/OpenAI vars still reach the spawned server.
      NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: "phc_e2e_placeholder",
      NEXT_PUBLIC_POSTHOG_HOST: "https://posthog.invalid",
    },
    reuseExistingServer: !process.env.CI,
    timeout: 300 * 1000, // 5 minutes for build + server to start
  },
});
