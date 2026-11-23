import path from "node:path";
import { runWithLocalDb } from "@tuja/dev-tools/run-with-local-db";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { schema } from "../schema.ts";
import { DEV_USER_EMAIL, seedDevUser } from "./seed-dev-user.ts";
import { startDevDb } from "./start-dev-db.ts";

const APP_DIR = path.resolve(import.meta.dirname, "../../..");

async function seed(connectionString: string) {
  const pool = new Pool({ connectionString, max: 1 });
  try {
    if (await seedDevUser(drizzle({ client: pool, schema }))) {
      console.log(`Fund: seeded the dev user ${DEV_USER_EMAIL}.`);
    }
    console.log(
      "Fund: sign in with `pnpm --filter fund fund:session`, then open http://localhost (not a LAN host).",
    );
  } finally {
    await pool.end();
  }
}

runWithLocalDb({
  label: "Fund",
  appDir: APP_DIR,
  urlName: "FUND_DATABASE_URL",
  start: startDevDb,
  dataDir: path.join(APP_DIR, ".fund-db"),
  seed,
  // Not a secret: it seals cookies only on this machine.
  localEnv: { FUND_AUTH_SECRET: "local-fund-auth-secret-for-dev-only" },
}).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
