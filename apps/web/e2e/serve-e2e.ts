import { spawn } from "node:child_process";
import { buildIfStale } from "./build-if-stale.ts";

const env = {
  ...process.env,
  // Exercises the real posthog.init() path (see src/analytics/init-post-hog.ts)
  // without sending anything: the host never resolves, so nothing leaves
  // the machine, but a crash in init still fails the suite. NEXT_PUBLIC_*
  // is inlined at build time, so these only take effect via the local
  // build below — on CI the prebuilt artifact already carries the same
  // placeholders from playwright.yml's build step.
  NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: "phc_e2e_placeholder",
  NEXT_PUBLIC_POSTHOG_HOST: "https://posthog.invalid",
};

/**
 * Serves the app for the e2e tests on `PORT`: the production build with the
 * e2e settings. Locally it builds first when the build is stale.
 */
async function main() {
  if (!process.env.CI) await buildIfStale(env);
  // The wrapper runs `pnpm start` and catches server errors for
  // web-server-error-reporter.ts to fail the run on.
  const server = spawn("node", ["e2e/web-server-with-error-log.mjs"], {
    env,
    stdio: "inherit",
  });
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
    process.on(signal, () => server.kill(signal));
  }
  server.once("exit", (code) => process.exit(code ?? 1));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
