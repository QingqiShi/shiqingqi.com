export function localAssistantDatabaseUrl(port: number): string {
  return `postgres://postgres:postgres@127.0.0.1:${String(port)}/postgres`;
}

/**
 * The settings that local development adds to `env`, without the ones that
 * the developer set. Null when the developer set `ASSISTANT_DATABASE_URL`,
 * also to an empty value. None of the secrets is a real secret.
 */
export function getLocalAssistantDefaults(
  env: Partial<Record<string, string>>,
  databasePort: number,
): Record<string, string> | null {
  if (env.ASSISTANT_DATABASE_URL !== undefined) return null;
  const defaults = {
    ASSISTANT_DATABASE_URL: localAssistantDatabaseUrl(databasePort),
    ASSISTANT_AUTH_SECRET: "local-assistant-auth-secret",
    ASSISTANT_CREDENTIAL_KEY: "bG9jYWwtYXNzaXN0YW50LWNyZWRlbnRpYWwta2V5LTM=",
  };
  return Object.fromEntries(
    Object.entries(defaults).filter(([name]) => env[name] === undefined),
  );
}
