import { spawn, type ChildProcess } from "node:child_process";
import { parseArgs } from "node:util";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { DEV_DB_DIR, startDevDb, type DevDb } from "../db/dev/start-dev-db.ts";
import { schema } from "../db/schema.ts";
import { isPortOpen } from "./is-port-open.ts";
import { readPortOption } from "./read-cli-options.ts";
import { readDevAssistantEnv } from "./read-dev-assistant-env.ts";
import { seedDevUser } from "./seed-dev-user.ts";

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
    const userId = await seedDevUser(drizzle({ client: pool, schema }));
    if (userId) console.log(`Assistant: seeded the dev user ${userId}.`);
  } finally {
    await pool.end();
  }
}

/**
 * Runs a command, normally `next dev`. When the developer did not set
 * `ASSISTANT_DATABASE_URL`, it also serves and seeds the dev database in
 * this process and gives the command the local settings.
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
  const { databaseUrl, defaults } = readDevAssistantEnv(databasePort);

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
          `Assistant: using the database that already runs on port ${String(databasePort)}.`,
        );
        return null;
      }
      const db = await startDevDb({ port: databasePort, dataDir: DEV_DB_DIR });
      console.log(`Assistant: dev database ${DEV_DB_DIR} on ${databaseUrl}`);
      return db;
    });
    dbStart
      .then(() => seedWhenEmpty(databaseUrl))
      .then(() => {
        console.log(
          "Assistant: sign in with `pnpm --filter assistant assistant:session`, then open http://localhost (not a LAN host).",
        );
      })
      .catch((error: unknown) => {
        if (stopping) return;
        console.error(
          "Assistant: the dev database failed, so the dev server stops.",
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
