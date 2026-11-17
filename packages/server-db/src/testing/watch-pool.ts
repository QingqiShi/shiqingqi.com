import type { PGlite } from "@electric-sql/pglite";
import { servePglite } from "@tuja/dev-tools/serve-pglite";
import { Pool, type PoolClient } from "pg";

/**
 * A pg Pool of one connection to `pglite`, the driver that production uses.
 * A connect that waits fails after a second, so a client that a test keeps
 * shows as an error, not as a hang.
 */
export async function poolOn(pglite: PGlite) {
  const server = await servePglite(pglite, { host: "127.0.0.1", port: 0 });
  const pool = new Pool({
    connectionString: `postgres://postgres@127.0.0.1:${String(server.port)}/postgres`,
    max: 1,
    connectionTimeoutMillis: 1000,
  });
  return {
    pool,
    close: async () => {
      await pool.end();
      await server.close();
    },
  };
}

/**
 * Watches the clients that `pool.connect()` gives with a promise, as a
 * transaction takes them. `pool.query`, which takes a client with a
 * callback, is not watched.
 */
export function watchPool(pool: Pool) {
  /** Each `release` of a client: false gives it back to the pool, true closes it. */
  const releases: boolean[] = [];
  /** The statements that fail once on the next client, by their start. */
  let failing: string[] = [];

  function watch(client: PoolClient, fail: string[]) {
    const release = client.release.bind(client);
    const query: unknown = Reflect.get(client, "query");
    if (typeof query !== "function") throw new Error("A client has no query.");
    Reflect.set(client, "release", (error?: Error | boolean) => {
      releases.push(error !== undefined && error !== false);
      Reflect.deleteProperty(client, "release");
      Reflect.deleteProperty(client, "query");
      release(error);
    });
    Reflect.set(client, "query", (...args: unknown[]): unknown => {
      const [first] = args;
      const text: unknown =
        typeof first === "object" && first !== null
          ? Reflect.get(first, "text")
          : first;
      const at =
        typeof text === "string"
          ? fail.findIndex((start) =>
              text.trim().toLowerCase().startsWith(start),
            )
          : -1;
      if (at === -1) {
        const sent: unknown = Reflect.apply(query, client, args);
        return sent;
      }
      fail.splice(at, 1);
      return Promise.reject(new Error("Connection terminated"));
    });
  }

  const connect: unknown = Reflect.get(pool, "connect");
  if (typeof connect !== "function") throw new Error("A pool has no connect.");
  Reflect.set(pool, "connect", (...args: unknown[]): unknown => {
    const connected: unknown = Reflect.apply(connect, pool, args);
    if (!(connected instanceof Promise)) return connected;
    return connected.then((client: PoolClient) => {
      watch(client, failing);
      failing = [];
      return client;
    });
  });

  return {
    releases,
    /** Fails each of `statements` once on the next client, e.g. `["begin"]`. */
    failNext(statements: string[]) {
      failing = [...statements];
    },
  };
}
