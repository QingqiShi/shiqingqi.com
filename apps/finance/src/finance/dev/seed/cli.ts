import { Pool } from "pg";
import { assertLocalDatabaseUrl } from "../assert-local-database-url.ts";
import { readCliOptions, readIntegerOption } from "../read-cli-options.ts";
import { seedDevDatabase } from "./seed-dev-database.ts";
import { SYNTHETIC_HOUSEHOLD_DEFAULTS } from "./seed-synthetic-household.ts";

async function main() {
  const values = readCliOptions({
    years: { type: "string" },
    "per-year": { type: "string" },
    transactions: { type: "string" },
    seed: { type: "string" },
    today: { type: "string" },
    demo: { type: "boolean", default: false },
    force: { type: "boolean", default: false },
  });
  const years = readIntegerOption("years", values.years);
  const transactions = readIntegerOption("transactions", values.transactions);
  const transactionsPerYear =
    transactions === undefined
      ? readIntegerOption("per-year", values["per-year"])
      : Math.ceil(transactions / (years ?? SYNTHETIC_HOUSEHOLD_DEFAULTS.years));

  const connectionString = process.env.FINANCE_DATABASE_URL;
  if (!connectionString) throw new Error("Set FINANCE_DATABASE_URL.");
  if (!values.force) {
    assertLocalDatabaseUrl(connectionString, "Pass --force to seed it anyway.");
  }

  const pool = new Pool({ connectionString });
  try {
    await seedDevDatabase(pool, {
      synthetic: !values.demo,
      demo: values.demo,
      years,
      transactionsPerYear,
      seed: readIntegerOption("seed", values.seed),
      today: values.today,
    });
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
