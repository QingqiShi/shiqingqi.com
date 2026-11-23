import { spawn, type ChildProcess } from "node:child_process";
import { parseArgs } from "node:util";
import { isPortOpen } from "./is-port-open.ts";
import { localDatabaseUrl } from "./local-database-url.ts";
import { readPortOption } from "./read-cli-options.ts";
import { readNextDevEnv } from "./read-next-dev-env.ts";

const STOP_SIGNALS = ["SIGINT", "SIGTERM", "SIGHUP"] as const;

interface LocalDb {
  close: () => Promise<void>;
}

interface LocalDbOptions {
  /** The app's name in the messages, such as "Trips". */
  label: string;
  /** The app's folder, where Next reads the env files. */
  appDir: string;
  /** The variable that holds the database URL, such as `TRIPS_DATABASE_URL`. */
  urlName: string;
  /** Starts the database on the port. Without `dataDir`, it is in memory. */
  start: (options: { port: number; dataDir?: string }) => Promise<LocalDb>;
  /** Where the database keeps its files between runs. */
  dataDir: string;
  /** Runs when the local database is up, also when another process serves it. */
  seed: (databaseUrl: string) => Promise<void>;
  /** Values for the command with the local database, for each variable that the developer did not set. */
  localEnv?: Record<string, string>;
}

function waitForExit(child: ChildProcess): Promise<number> {
  return new Promise((resolve) => {
    child.once("exit", (code, signal) => {
      resolve(code ?? (signal === null ? 1 : 128));
    });
  });
}

/**
 * Runs the command after `--`, normally `next dev`, with a local database.
 * When the developer did not set the URL variable, it first serves the
 * database in this process on `--db-port` and seeds it, then gives the
 * command its URL. With `--memory`, the database is always the local one and
 * keeps no files.
 */
export async function runWithLocalDb(options: LocalDbOptions) {
  const { label, urlName } = options;
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { "db-port": { type: "string" }, memory: { type: "boolean" } },
  });
  if (positionals.length === 0) {
    throw new Error("Give the command to run after --.");
  }
  const [command, ...args] = positionals;
  const port = readPortOption("db-port", values["db-port"]);
  const inMemory = values.memory === true;
  const devEnv = readNextDevEnv(options.appDir);
  const isLocal = inMemory || devEnv[urlName] === undefined;
  const databaseUrl = localDatabaseUrl(port);

  let db: LocalDb | null = null;
  if (isLocal) {
    if (await isPortOpen(port)) {
      console.log(
        `${label}: using the database that already runs on port ${String(port)}.`,
      );
    } else {
      const dataDir = inMemory ? undefined : options.dataDir;
      db = await options.start({ port, dataDir });
      console.log(
        `${label}: local database ${dataDir ?? "in memory"} on ${databaseUrl}`,
      );
    }
    await options.seed(databaseUrl);
  }

  const child = spawn(command, args, {
    stdio: "inherit",
    env: isLocal
      ? {
          ...Object.fromEntries(
            Object.entries(options.localEnv ?? {}).filter(
              ([name]) => devEnv[name] === undefined,
            ),
          ),
          ...process.env,
          [urlName]: databaseUrl,
        }
      : process.env,
  });
  for (const signal of STOP_SIGNALS) {
    process.on(signal, () => {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill(signal);
      }
    });
  }
  const code = await waitForExit(child);
  await db?.close();
  process.exit(code);
}
