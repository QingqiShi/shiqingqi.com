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

/* Specs that need a WebGPU adapter. */
const webgpuSpecs = /\.webgpu\.spec\.ts$/;
/* Specs that run in WebKit, the engine of Safari on iPhone. */
const webkitSpecs = /\.webkit\.spec\.ts$/;

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
      testIgnore: [webgpuSpecs, webkitSpecs],
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      testMatch: webkitSpecs,
    },
    /* Chromium has no WebGPU adapter without a GPU. These flags give it the
     * SwiftShader adapter, for the WebGPU specs only. On Linux, only the
     * headless shell with SwiftShader Vulkan shows a WebGPU <canvas> element
     * in a screenshot. On macOS, that setup loses the device after a few
     * frames, so the specs use the full Chromium build there.
     * SwiftShader draws on the CPU. Two of these browsers on one CI runner
     * slow each other down until a frame takes seconds, and the specs that
     * wait for an animation then time out. Thus they run one at a time. */
    {
      name: "chromium-webgpu",
      workers: 1,
      use: {
        ...devices["Desktop Chrome"],
        ...(process.platform === "linux"
          ? {
              launchOptions: {
                args: [
                  "--enable-unsafe-webgpu",
                  "--use-webgpu-adapter=swiftshader",
                  "--enable-features=Vulkan",
                  "--use-vulkan=swiftshader",
                  "--use-angle=swiftshader",
                  "--disable-vulkan-surface",
                ],
              },
            }
          : {
              channel: "chromium",
              launchOptions: {
                args: [
                  "--enable-unsafe-webgpu",
                  "--use-webgpu-adapter=swiftshader",
                ],
              },
            }),
      },
      testMatch: webgpuSpecs,
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

  webServer: {
    // On CI the app is built once in a dedicated job and its output is
    // downloaded into each shard, so the script only starts it. Locally it
    // builds when the build is stale. It also serves the in-memory Finance
    // database, which starts empty, and each Finance spec seeds the household
    // it uses. A reused server, such as `pnpm test:e2e:serve`, runs Finance
    // only when it has the e2e Finance settings; `pnpm dev` does not.
    command: "tsx e2e/serve-e2e.ts",
    url: baseURL,
    // Playwright merges this object onto process.env rather than replacing
    // it, so CI's TMDB/OpenAI vars still reach the spawned server.
    env: { PORT: port },
    reuseExistingServer: !process.env.CI,
    // Locally the timer also runs during the build, which can take 8
    // minutes on a loaded laptop. CI only starts a prebuilt app.
    timeout: (process.env.CI ? 5 : 15) * 60 * 1000,
  },
});
