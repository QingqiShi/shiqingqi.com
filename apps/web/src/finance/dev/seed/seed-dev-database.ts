import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { schema } from "../../db/schema.ts";
import { seedDemoHousehold } from "./seed-demo-household.ts";
import {
  SYNTHETIC_HOUSEHOLD_DEFAULTS,
  seedSyntheticHousehold,
  type SyntheticHouseholdOptions,
} from "./seed-synthetic-household.ts";

interface DevSeedOptions extends Omit<
  SyntheticHouseholdOptions,
  "ownerUserId"
> {
  /** False for a database that has real Households, such as production. */
  synthetic?: boolean;
  demo?: boolean;
}

/** Seeds a synthetic Household, the demo Household, or both into a database and prints what it wrote. */
export async function seedDevDatabase(
  pool: Pool,
  { synthetic = true, demo = false, ...options }: DevSeedOptions = {},
) {
  const started = performance.now();
  const db = drizzle({ client: pool, schema });
  const seeded: string[] = [];
  if (synthetic) {
    const result = await seedSyntheticHousehold(db, options);
    const { counts } = result;
    const seed = options.seed ?? SYNTHETIC_HOUSEHOLD_DEFAULTS.seed;
    seeded.push(
      `household ${result.householdId} (seed ${String(seed)}, to ${result.today}): ${String(counts.accounts)} accounts, ${String(counts.transactions)} transactions, ${String(counts.entries)} entries, ${String(counts.valuations)} valuations`,
    );
  }
  if (demo) {
    const result = await seedDemoHousehold(db, options);
    seeded.push(`demo household ${result.householdId} (to ${result.today})`);
  }
  // The query planner needs statistics for the new rows. PGlite does not run autovacuum.
  await pool.query("analyze");
  console.log(
    `Seeded ${seeded.join("; ")} in ${((performance.now() - started) / 1000).toFixed(1)} s`,
  );
}
