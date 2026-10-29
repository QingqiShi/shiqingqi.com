import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildLocalFinanceEnv } from "../src/finance/dev/build-local-finance-env.ts";

/* The port is fixed per worktree, so that a later run can reuse a web server
 * that still runs on this database. The dev database uses offset 2433. The
 * relative path is from apps/finance, as in playwright.config.ts. */
process.env.FINANCE_E2E_DB_PORT ??= execFileSync(
  "node",
  ["../../scripts/get-worktree-port.mjs", "3433"],
  { encoding: "utf8" },
).trim();

export const FINANCE_E2E_DB_PORT = Number(process.env.FINANCE_E2E_DB_PORT);

/** The folder where the web server writes the emails it would send. */
export const FINANCE_E2E_EMAIL_OUTBOX: string =
  (process.env.FINANCE_E2E_EMAIL_OUTBOX ??= path.join(
    tmpdir(),
    `finance-e2e-outbox-${String(FINANCE_E2E_DB_PORT)}`,
  ));

/** The Finance settings of the web server that the e2e tests use. */
export const financeE2eEnv = {
  ...buildLocalFinanceEnv({
    databasePort: FINANCE_E2E_DB_PORT,
    authSecret: "e2e-finance-auth-secret-for-tests-only",
    credentialKey: "ZTJlLWZpbmFuY2UtY3JlZGVudGlhbC1rZXktMzJieXQ=",
  }),
  FINANCE_EMAIL_OUTBOX: FINANCE_E2E_EMAIL_OUTBOX,
};
