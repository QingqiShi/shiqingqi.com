import { spawn } from "node:child_process";
import type { DevDb } from "../src/finance/db/dev/start-dev-db.ts";
import { isPortOpen } from "../src/finance/dev/is-port-open.ts";
import { buildIfStale } from "./build-if-stale.ts";
import {
  FINANCE_E2E_DB_PORT,
  financeE2eEnv,
} from "./finance/finance-e2e-env.ts";

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
  // Read at runtime, so the prebuilt CI artifact picks them up too.
  ...financeE2eEnv,
};

/**
 * Serves the app for the e2e tests on `PORT`: the production build with the
 * e2e settings, and the in-memory Finance e2e database. Locally it builds
 * first when the build is stale. The database starts at the same time, so
 * specs that do not use Finance do not wait for it.
 */
async function main() {
  const dbStart: Promise<DevDb | null> = isPortOpen(FINANCE_E2E_DB_PORT).then(
    async (open) => {
      if (open) return null;
      // Load PGlite only when no database runs on the port.
      const { startDevDb } =
        await import("../src/finance/db/dev/start-dev-db.ts");
      return startDevDb({ port: FINANCE_E2E_DB_PORT });
    },
  );
  const stop = async (code: number) => {
    const db = await dbStart.catch(() => null);
    await db?.close();
    process.exit(code);
  };
  dbStart.then(
    (db) => {
      console.log(
        `Finance e2e database: ${db ? "in memory" : "already running"} on port ${String(FINANCE_E2E_DB_PORT)}`,
      );
    },
    (error: unknown) => {
      console.error("Finance e2e database failed to start.", error);
      process.exit(1);
    },
  );

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
  server.once("exit", (code) => void stop(code ?? 1));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
