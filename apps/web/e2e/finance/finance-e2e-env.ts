import { execFileSync } from "node:child_process";
import { buildLocalFinanceEnv } from "../../src/finance/dev/build-local-finance-env.ts";

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

/** The Finance settings of the web server that Playwright starts. */
export const financeE2eEnv = buildLocalFinanceEnv({
  databasePort: FINANCE_E2E_DB_PORT,
  authSecret: "e2e-finance-auth-secret-for-tests-only",
  setupSecret: FINANCE_E2E_SETUP_SECRET,
});
