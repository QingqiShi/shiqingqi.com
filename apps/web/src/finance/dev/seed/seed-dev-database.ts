import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { schema } from "../../db/schema.ts";
import {
  SYNTHETIC_HOUSEHOLD_DEFAULTS,
  seedSyntheticHousehold,
  type SyntheticHouseholdOptions,
} from "./seed-synthetic-household.ts";

/** Seeds a synthetic Household into a dev database and prints what it wrote. */
export async function seedDevDatabase(
  pool: Pool,
  options: SyntheticHouseholdOptions = {},
) {
  const started = performance.now();
  const result = await seedSyntheticHousehold(
    drizzle({ client: pool, schema }),
    options,
  );
  // The query planner needs statistics for the new rows. PGlite does not run autovacuum.
  await pool.query("analyze");
  const { counts } = result;
  const seed = options.seed ?? SYNTHETIC_HOUSEHOLD_DEFAULTS.seed;
  console.log(
    `Seeded household ${result.householdId} (seed ${String(seed)}, to ${result.today}): ${String(counts.accounts)} accounts, ${String(counts.transactions)} transactions, ${String(counts.entries)} entries, ${String(counts.valuations)} valuations in ${((performance.now() - started) / 1000).toFixed(1)} s`,
  );
}
