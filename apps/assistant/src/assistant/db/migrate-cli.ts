import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import { ASSISTANT_MIGRATIONS_FOLDER } from "./assistant-migrations-folder.ts";

config({ path: ".env.local", quiet: true });

/**
 * Runs the pending migrations. The builds of several preview deployments
 * migrate the same database at the same time: the session lock makes them
 * run one after the other, and each one reads the applied migrations only
 * after it has the lock.
 */
async function main() {
  // The lock must stay on one server session, which the pooler does not keep.
  const connectionString =
    process.env.ASSISTANT_DATABASE_URL_UNPOOLED ??
    process.env.ASSISTANT_DATABASE_URL;
  if (!connectionString) throw new Error("Set ASSISTANT_DATABASE_URL.");

  const client = new Client({ connectionString });
  await client.connect();
  try {
    const db = drizzle({ client });
    await db.execute(
      sql`select pg_advisory_lock(hashtext('assistant:migrate'))`,
    );
    await migrate(db, { migrationsFolder: ASSISTANT_MIGRATIONS_FOLDER });
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
