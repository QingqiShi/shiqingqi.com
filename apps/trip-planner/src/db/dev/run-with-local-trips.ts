import path from "node:path";
import { runWithLocalDb } from "@tuja/dev-tools/run-with-local-db";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { importTrip } from "../../trips/import-trip.ts";
import sampleTrip from "../../trips/testing/sample-trip.json";
import { schema } from "../schema.ts";
import { startDevDb } from "./start-dev-db.ts";

const APP_DIR = path.resolve(import.meta.dirname, "../../..");

/** Copies the made-up trip into the local database, so that a change to its file shows after a restart. */
async function seed(connectionString: string) {
  const pool = new Pool({ connectionString, max: 1 });
  try {
    const db = drizzle({ client: pool, schema });
    await importTrip(db, sampleTrip);
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
