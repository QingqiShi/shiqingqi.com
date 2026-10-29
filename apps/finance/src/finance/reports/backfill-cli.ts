import { parseArgs } from "node:util";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { listHouseholdIds } from "../db/list-household-ids.ts";
import { schema } from "../db/schema.ts";
import { generateWeeklyReports } from "./generate-weekly-reports.ts";

async function main() {
  // pnpm passes the `--` of `pnpm finance:reports:backfill -- --household x` on to the script.
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const { values } = parseArgs({
    args,
    options: { household: { type: "string" } },
  });
  const connectionString = process.env.FINANCE_DATABASE_URL;
  if (!connectionString) throw new Error("Set FINANCE_DATABASE_URL.");

  const pool = new Pool({ connectionString });
  try {
    const db = drizzle({ client: pool, schema });
    const householdIds = values.household
      ? [values.household]
      : await listHouseholdIds(db);
    for (const householdId of householdIds) {
      const started = performance.now();
      const result = await generateWeeklyReports(
        db,
        householdId,
        new Date(),
        "all",
      );
      console.log(
        `Household ${householdId}: ${String(result.reports.length)} weeks, ${String(result.written)} written, ${String(result.unchanged)} unchanged, ${String(result.deleted)} deleted in ${((performance.now() - started) / 1000).toFixed(1)} s`,
      );
    }
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
