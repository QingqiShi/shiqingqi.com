export function localFinanceDatabaseUrl(port: number): string {
  return `postgres://postgres:postgres@127.0.0.1:${String(port)}/postgres`;
}

/** The Finance settings of a server that uses a local database. None of the secrets is a real secret. */
export function buildLocalFinanceEnv({
  databasePort,
  authSecret,
  setupSecret,
}: {
  databasePort: number;
  authSecret: string;
  setupSecret: string;
}) {
  return {
    FINANCE_DATABASE_URL: localFinanceDatabaseUrl(databasePort),
    FINANCE_AUTH_SECRET: authSecret,
    FINANCE_SETUP_SECRET: setupSecret,
    FINANCE_LUNCHFLOW_MODE: "fake",
    FINANCE_RATE_LIMIT: "off",
  };
}
