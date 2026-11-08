import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { BUDDY_MIGRATIONS_FOLDER } from "../buddy-migrations-folder.ts";
import { schema } from "../schema.ts";
import type { BuddyDb } from "../types.ts";

export type TestDb = BuddyDb & { close: () => Promise<void> };

/** An empty, migrated, in-memory Postgres. */
export async function createTestDb(): Promise<TestDb> {
  const client = await PGlite.create();
  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder: BUDDY_MIGRATIONS_FOLDER });
  return Object.assign(db, { close: () => client.close() });
}
