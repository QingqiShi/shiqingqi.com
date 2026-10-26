import { spawn, type ChildProcess } from "node:child_process";
import { parseArgs } from "node:util";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { DEV_DB_DIR, startDevDb, type DevDb } from "../db/dev/start-dev-db.ts";
import { lookups } from "../db/lookups.ts";
import { schema } from "../db/schema.ts";
import { asFinanceApp } from "../db/with-household.ts";
import { isPortOpen } from "./is-port-open.ts";
import { readPortOption } from "./read-cli-options.ts";
import { readDevFinanceEnv } from "./read-dev-finance-env.ts";
import { seedDevDatabase } from "./seed/seed-dev-database.ts";

const STOP_SIGNALS = ["SIGINT", "SIGTERM", "SIGHUP"] as const;

function waitForExit(child: ChildProcess): Promise<number> {
  return new Promise((resolve) => {
    child.once("exit", (code, signal) => {
      resolve(code ?? (signal === null ? 1 : 128));
    });
  });
}

async function seedWhenEmpty(connectionString: string) {
  const pool = new Pool({ connectionString, max: 1 });
  try {
    const householdIds = await asFinanceApp(
      drizzle({ client: pool, schema }),
      (db) => lookups.householdIds(db),
    );
    if (householdIds.length > 0) return;
    console.log("Finance: seeding a synthetic Household…");
    await seedDevDatabase(pool);
  } finally {
    await pool.end();
  }
}

/**
 * Runs a command, normally `next dev`. When the developer did not set
 * `FINANCE_DATABASE_URL`, it also serves and seeds the dev database in this
 * process and gives the command the local Finance settings.
 */
function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { "db-port": { type: "string" } },
  });
  if (positionals.length === 0) {
    throw new Error("Give the command to run after --.");
  }
  const [command, ...args] = positionals;
  const databasePort = readPortOption("db-port", values["db-port"]);
  const { databaseUrl, defaults } = readDevFinanceEnv(databasePort);

  const child = spawn(command, args, {
    stdio: "inherit",
    env: { ...process.env, ...defaults },
  });
  for (const signal of STOP_SIGNALS) {
    process.on(signal, () => {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill(signal);
      }
    });
  }

  let stopping = false;
  let failed = false;
  let dbStart: Promise<DevDb | null> = Promise.resolve(null);
  if (defaults) {
    dbStart = isPortOpen(databasePort).then(async (open) => {
      if (open) {
        console.log(
          `Finance: using the database that already runs on port ${String(databasePort)}.`,
        );
        return null;
      }
      const db = await startDevDb({ port: databasePort, dataDir: DEV_DB_DIR });
      console.log(`Finance: dev database ${DEV_DB_DIR} on ${databaseUrl}`);
      return db;
    });
    dbStart
      .then(() => seedWhenEmpty(databaseUrl))
      .then(() => {
        console.log(
          "Finance: sign in with `pnpm --filter web finance:session`, then open http://localhost (not a LAN host).",
        );
      })
      .catch((error: unknown) => {
        if (stopping) return;
        console.error(
          "Finance: the dev database failed, so the dev server stops.",
          error,
        );
        failed = true;
        child.kill("SIGTERM");
      });
  }

  void waitForExit(child).then(async (code) => {
    stopping = true;
    const db = await dbStart.catch(() => null);
    await db?.close();
    process.exit(failed ? 1 : code);
  });
}

try {
  main();
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
