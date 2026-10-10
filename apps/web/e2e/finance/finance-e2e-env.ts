import { execFileSync } from "node:child_process";

function findFreePort(): string {
  return execFileSync(
    process.execPath,
    [
      "-e",
      'const s = require("node:net").createServer(); s.listen(0, "127.0.0.1", () => { process.stdout.write(String(s.address().port)); s.close(); });',
    ],
    { encoding: "utf8" },
  ).trim();
}

/* Playwright loads the config in the runner and again in each worker.
 * Workers inherit the runner's environment, so all of them use the port
 * that the runner chose. */
process.env.FINANCE_E2E_DB_PORT ??= findFreePort();

export const FINANCE_E2E_DB_PORT = Number(process.env.FINANCE_E2E_DB_PORT);

export const FINANCE_E2E_SETUP_SECRET = "e2e-finance-setup-secret";

/** The Finance settings of the web server that Playwright starts. None of them is a real secret. */
export const financeE2eEnv = {
  FINANCE_DATABASE_URL: `postgres://postgres:postgres@127.0.0.1:${String(FINANCE_E2E_DB_PORT)}/postgres`,
  FINANCE_AUTH_SECRET: "e2e-finance-auth-secret-for-tests-only",
  FINANCE_SETUP_SECRET: FINANCE_E2E_SETUP_SECRET,
  FINANCE_LUNCHFLOW_MODE: "fake",
  FINANCE_RATE_LIMIT: "off",
};
