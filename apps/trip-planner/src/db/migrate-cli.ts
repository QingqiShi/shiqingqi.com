import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import { tripFiles } from "../trips/data/trip-files.ts";
import { importTrip } from "../trips/import-trip.ts";
import { schema } from "./schema.ts";
import { TRIPS_MIGRATIONS_FOLDER } from "./trips-migrations-folder.ts";

config({ path: ".env.local", quiet: true });

/**
 * Runs the pending migrations, then copies the trips that are still files
 * into the database. The builds of several preview deployments do this to
 * the same database at the same time: the session lock makes them run one
 * after the other, and each one reads the applied migrations only after it
 * has the lock.
 */
async function main() {
  // The lock must stay on one server session, which the pooler does not keep.
  const connectionString =
    process.env.TRIPS_DATABASE_URL_UNPOOLED ?? process.env.TRIPS_DATABASE_URL;
  if (!connectionString) throw new Error("Set TRIPS_DATABASE_URL.");

  const client = new Client({ connectionString });
  await client.connect();
  try {
    const db = drizzle({ client, schema });
    await db.execute(sql`select pg_advisory_lock(hashtext('trips:migrate'))`);
    await migrate(db, { migrationsFolder: TRIPS_MIGRATIONS_FOLDER });
    for (const file of tripFiles) {
      console.log(`Trips: a trip file is ${await importTrip(db, file)}.`);
    }
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
