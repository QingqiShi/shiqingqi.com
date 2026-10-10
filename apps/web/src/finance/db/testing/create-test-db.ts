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
  const client = new PGlite({ loadDataDir: await migratedDataDir });
  const db = drizzle({ client, schema });
  return Object.assign(db, { close: () => client.close() });
}
