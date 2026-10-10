import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import "server-only";
import { schema } from "./schema.ts";
import type { FinanceDb } from "./types.ts";

/**
 * Pool settings for Vercel Fluid compute, where one instance serves many
 * requests and suspends when idle. A few connections per instance are
 * enough behind the Neon pooler. A connect that hangs (for example while
 * Neon wakes from scale to zero) fails after 10 s instead of holding the
 * request; idle clients close soon, and `attachDatabasePool` closes them
 * before the instance suspends. Each request transaction also sets its own
 * statement timeout (`setStatementTimeout`).
 */
const FINANCE_POOL_OPTIONS = {
  max: 5,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 5_000,
} satisfies PoolConfig;

let db: FinanceDb | null = null;

export function getFinanceDb(): FinanceDb {
  if (!db) {
    const connectionString = process.env.FINANCE_DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "FINANCE_DATABASE_URL is not set. For local development, run `pnpm --filter web finance:db` and set FINANCE_DATABASE_URL to the URL it prints.",
      );
    }
    const pool = new Pool({ connectionString, ...FINANCE_POOL_OPTIONS });
    attachDatabasePool(pool);
    db = drizzle({ client: pool, schema });
  }
  return db;
}
