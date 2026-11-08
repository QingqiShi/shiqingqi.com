import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import { BUDDY_MIGRATIONS_FOLDER } from "./buddy-migrations-folder.ts";

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
    process.env.BUDDY_DATABASE_URL_UNPOOLED ?? process.env.BUDDY_DATABASE_URL;
  if (!connectionString) {
    // The page and the APIs do not use the archive database, so a deployment
    // without it still works: only the archive cron returns 503.
    console.warn("BUDDY_DATABASE_URL is not set: no migrations ran.");
    return;
  }

  const client = new Client({ connectionString });
  await client.connect();
  try {
    const db = drizzle({ client });
    await db.execute(sql`select pg_advisory_lock(hashtext('buddy:migrate'))`);
    await migrate(db, { migrationsFolder: BUDDY_MIGRATIONS_FOLDER });
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
