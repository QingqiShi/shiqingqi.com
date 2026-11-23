import { execFileSync } from "node:child_process";
import path from "node:path";
import { localDatabaseUrl } from "@tuja/dev-tools/local-database-url";
import { readNextDevEnv } from "@tuja/dev-tools/read-next-dev-env";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { schema } from "../schema.ts";
import type { FundDb } from "../types.ts";

const APP_DIR = path.resolve(import.meta.dirname, "../../..");
const REPO_DIR = path.resolve(APP_DIR, "../..");
const DB_PORT_OFFSET = 2833;

/** The port of this worktree at `offset`, as `scripts/get-worktree-port.mjs` gives it. */
export function worktreePort(offset: number): number {
  // The script runs with this process's own Node binary, not with whatever
  // `node` the PATH holds: under `vercel env run`, that can be the Vercel CLI.
  const port = execFileSync(
    process.execPath,
    [path.join(REPO_DIR, "scripts/get-worktree-port.mjs"), String(offset)],
    { encoding: "utf8" },
  ).trim();
  return Number(port);
}

/**
 * The local database of `pnpm dev`, for a dev CLI. It refuses to run when
 * `FUND_DATABASE_URL` is set, because `pnpm dev` then uses another database.
 */
export async function openLocalDb({
  cli,
  maxConnections,
}: {
  /** The name of the CLI, for the error messages. */
  cli: string;
  maxConnections: number;
}): Promise<{ db: FundDb; close: () => Promise<void> }> {
  if (readNextDevEnv(APP_DIR).FUND_DATABASE_URL !== undefined) {
    throw new Error(
      `FUND_DATABASE_URL is set, so \`pnpm dev\` does not use the local database. ${cli} uses the local database only.`,
    );
  }
  const url = localDatabaseUrl(worktreePort(DB_PORT_OFFSET));
  const pool = new Pool({ connectionString: url, max: maxConnections });
  try {
    await pool.query("select 1");
  } catch (error) {
    await pool.end();
    throw new Error(
      `No database answers at ${url}. Start \`pnpm dev\` in apps/fund first.`,
      { cause: error },
    );
  }
  return { db: drizzle({ client: pool, schema }), close: () => pool.end() };
}
