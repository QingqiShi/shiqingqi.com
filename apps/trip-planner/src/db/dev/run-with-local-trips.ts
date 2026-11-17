import path from "node:path";
import { runWithLocalDb } from "@tuja/dev-tools/run-with-local-db";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { importTrip } from "../../trips/import-trip.ts";
import sampleTrip from "../../trips/testing/sample-trip.json";
import { schema } from "../schema.ts";
import { startDevDb } from "./start-dev-db.ts";

const APP_DIR = path.resolve(import.meta.dirname, "../../..");

/**
 * Copies the made-up trip into the local database, so that a change to its
 * file shows after a restart. It also makes every user of the local database
 * an owner of each trip in it, now and at each sign-up: a trip shows only to
 * its members, and a local database has no other way to get one.
 */
async function seed(connectionString: string) {
  const pool = new Pool({ connectionString, max: 1 });
  try {
    const db = drizzle({ client: pool, schema });
    await importTrip(db, sampleTrip);
    await db.execute(sql`
      create or replace function local_trip_owner() returns trigger
      language plpgsql as $$
      begin
        insert into trip_members (trip_id, user_id, role)
        select id, new.id, 'owner' from trips;
        return new;
      end
      $$`);
    await db.execute(sql`
      create or replace trigger local_trip_owner after insert on users
      for each row execute function local_trip_owner()`);
    await db.execute(sql`
      insert into trip_members (trip_id, user_id, role)
      select trips.id, users.id, 'owner' from trips cross join users
      on conflict do nothing`);
  } finally {
    await pool.end();
  }
}

runWithLocalDb({
  label: "Trips",
  appDir: APP_DIR,
  urlName: "TRIPS_DATABASE_URL",
  start: startDevDb,
  dataDir: path.join(APP_DIR, ".trips-db"),
  seed,
  // Not a secret: it seals cookies only on this machine.
  localEnv: { TRIPS_AUTH_SECRET: "local-trips-auth-secret-for-dev-only" },
}).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
