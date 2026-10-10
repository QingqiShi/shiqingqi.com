import { parseArgs } from "node:util";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { schema } from "../../db/schema.ts";
import { seedSyntheticHousehold } from "./seed-synthetic-household.ts";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function readInteger(
  name: string,
  value: string | undefined,
  fallback: number,
) {
  if (value === undefined) return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) {
    throw new Error(
      `--${name} takes a whole number of 1 or more, not ${value}`,
    );
  }
  return number;
}

async function main() {
  // pnpm passes the `--` of `pnpm finance:seed -- --years 2` on to the script.
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const { values } = parseArgs({
    args,
    options: {
      years: { type: "string" },
      "per-year": { type: "string" },
      transactions: { type: "string" },
      seed: { type: "string" },
      today: { type: "string" },
      force: { type: "boolean", default: false },
    },
  });
  const years = readInteger("years", values.years, 3);
  const transactionsPerYear =
    values.transactions === undefined
      ? readInteger("per-year", values["per-year"], 2000)
      : Math.ceil(
          readInteger("transactions", values.transactions, 6000) / years,
        );
  const seed = readInteger("seed", values.seed, 1);

  const connectionString = process.env.FINANCE_DATABASE_URL;
  if (!connectionString) throw new Error("Set FINANCE_DATABASE_URL.");
  const { hostname } = new URL(connectionString);
  if (!LOCAL_HOSTS.has(hostname) && !values.force) {
    throw new Error(
      `FINANCE_DATABASE_URL points at ${hostname}, not this machine. Pass --force to seed it anyway.`,
    );
  }

  const pool = new Pool({ connectionString });
  try {
    const started = performance.now();
    const result = await seedSyntheticHousehold(
      drizzle({ client: pool, schema }),
      {
        years,
        transactionsPerYear,
        seed,
        today: values.today,
      },
    );
    // The query planner needs statistics for the new rows. PGlite does not run autovacuum.
    await pool.query("analyze");
    const { counts } = result;
    console.log(
      `Seeded household ${result.householdId} (seed ${String(seed)}, to ${result.today}): ${String(counts.accounts)} accounts, ${String(counts.transactions)} transactions, ${String(counts.entries)} entries, ${String(counts.valuations)} valuations in ${((performance.now() - started) / 1000).toFixed(1)} s`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
