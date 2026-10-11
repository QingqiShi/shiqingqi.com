import { buildLocalFinanceEnv } from "./build-local-finance-env.ts";

/**
 * The Finance settings that local development adds to `env`, without the
 * ones that the developer set. Null when the developer set
 * `FINANCE_DATABASE_URL`, also to an empty value.
 */
export function getLocalFinanceDefaults(
  env: Partial<Record<string, string>>,
  databasePort: number,
): Record<string, string> | null {
  if (env.FINANCE_DATABASE_URL !== undefined) return null;
  const defaults = buildLocalFinanceEnv({
    databasePort,
    authSecret: "local-finance-auth-secret",
    credentialKey: "bG9jYWwtZmluYW5jZS1jcmVkZW50aWFsLWtleS0zMmI=",
  });
  return Object.fromEntries(
    Object.entries(defaults).filter(([name]) => env[name] === undefined),
  );
}
