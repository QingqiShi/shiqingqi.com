import { PGlite } from "@electric-sql/pglite";
import { servePglite } from "@tuja/dev-tools/serve-pglite";
import { drizzle } from "drizzle-orm/node-postgres";
import { drizzle as drizzleOnPglite } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { Pool } from "pg";
import { FUND_MIGRATIONS_FOLDER } from "../fund-migrations-folder.ts";
import { schema } from "../schema.ts";
import type { FundDb } from "../types.ts";

export type TestDb = FundDb & {
  /** The pool of the connections, for a test that counts them. */
  pool: Pool;
  close: () => Promise<void>;
};

/**
 * An empty, migrated, in-memory Postgres behind a `pg` Pool, the driver that
 * production uses, so that `runTransaction` runs as it does in a request.
 */
export async function createTestDb({
  maxConnections = 5,
}: { maxConnections?: number } = {}): Promise<TestDb> {
  const client = await PGlite.create();
  await migrate(drizzleOnPglite({ client }), {
    migrationsFolder: FUND_MIGRATIONS_FOLDER,
  });
  const server = await servePglite(client, { host: "127.0.0.1", port: 0 });
  const pool = new Pool({
    connectionString: `postgres://postgres@127.0.0.1:${String(server.port)}/postgres`,
    max: maxConnections,
    connectionTimeoutMillis: 5000,
  });
  let isClosed = false;
  return Object.assign(drizzle({ client: pool, schema }), {
    pool,
    close: async () => {
      if (isClosed) return;
      isClosed = true;
      await pool.end();
      await server.close();
      await client.close();
    },
  });
}
