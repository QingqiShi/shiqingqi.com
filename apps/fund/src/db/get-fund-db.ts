import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import "server-only";
import { schema } from "./schema.ts";
import type { FundDb } from "./types.ts";

/**
 * Pool settings for Vercel Fluid compute: a few connections per instance
 * behind the Neon pooler, a connect that hangs fails after 10 s, and
 * `attachDatabasePool` closes idle clients before the instance suspends.
 */
const POOL_OPTIONS = {
  max: 5,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 5_000,
} satisfies PoolConfig;

let db: FundDb | null = null;

/** The fund's database. Open a transaction on it with `runTransaction` from `@tuja/server-db/run-transaction`. */
export function getFundDb(): FundDb {
  if (!db) {
    const connectionString = process.env.FUND_DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "FUND_DATABASE_URL is not set. For local development, run `pnpm dev` in apps/fund, which starts a local database.",
      );
    }
    const pool = new Pool({ connectionString, ...POOL_OPTIONS });
    attachDatabasePool(pool);
    db = drizzle({ client: pool, schema });
  }
  return db;
}
