import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { FINANCE_MIGRATIONS_FOLDER } from "../finance-migrations-folder.ts";
import { schema } from "../schema.ts";
import type { FinanceDb } from "../types.ts";

export type TestDb = FinanceDb & { close: () => Promise<void> };

let migratedDataDir: Promise<File | Blob> | null = null;

async function createMigratedDataDir() {
  const client = new PGlite();
  await migrate(drizzle({ client }), {
    migrationsFolder: FINANCE_MIGRATIONS_FOLDER,
  });
  const dataDir = await client.dumpDataDir("none");
  await client.close();
  return dataDir;
}

/**
 * An empty, migrated, in-memory Postgres. The first call in a test file runs
 * the migrations; later calls copy that database, which is about five times
 * faster than a new one.
 */
export async function createTestDb(): Promise<TestDb> {
  migratedDataDir ??= createMigratedDataDir();
  // PGlite 0.5.10 makes `close` wait for the queries that run. A database that
  // the caller never queries does not become ready, and then `close` waits for
  // ever. `create` waits for the database to become ready.
  const client = await PGlite.create({ loadDataDir: await migratedDataDir });
  const db = drizzle({ client, schema });
  return Object.assign(db, { close: () => client.close() });
}
