/** The URL of the local database that `runWithLocalDb` serves on `port`. */
export function localDatabaseUrl(port: number): string {
  return `postgres://postgres:postgres@127.0.0.1:${String(port)}/postgres`;
}
