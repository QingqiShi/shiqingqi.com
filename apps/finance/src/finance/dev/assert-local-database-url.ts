import { parse } from "pg-connection-string";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/** The hosts that node-postgres or libpq can connect to for this URL, as `pg` parses it. */
function connectionHosts(connectionString: string): string[] {
  const { host, hostaddr } = parse(connectionString);
  // Without a host, node-postgres uses PGHOST. Keep the empty host, so that it is not local.
  const hosts = [host ?? ""];
  if (typeof hostaddr === "string") hosts.push(hostaddr);
  return hosts;
}

/** Throws unless the database runs on this machine, so that dev tools write only to a local database. */
export function assertLocalDatabaseUrl(connectionString: string, hint: string) {
  const remote = connectionHosts(connectionString).find(
    (host) => !LOCAL_HOSTS.has(host),
  );
  if (remote !== undefined) {
    throw new Error(
      `FINANCE_DATABASE_URL points at ${remote || "no host"}, not this machine. ${hint}`,
    );
  }
}
