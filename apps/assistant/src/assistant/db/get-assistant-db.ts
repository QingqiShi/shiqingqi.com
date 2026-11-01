import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import "server-only";
import { schema } from "./schema.ts";
import type { AssistantDb } from "./types.ts";

/**
 * Pool settings for Vercel Fluid compute: a few connections
 * per instance behind the Neon pooler, a connect that hangs fails after
 * 10 s, and `attachDatabasePool` closes idle clients before the instance
 * suspends.
 */
const POOL_OPTIONS = {
  max: 5,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 5_000,
} satisfies PoolConfig;

let db: AssistantDb | null = null;

export function getAssistantDb(): AssistantDb {
  if (!db) {
    const connectionString = process.env.ASSISTANT_DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "ASSISTANT_DATABASE_URL is not set. For local development, run `pnpm dev` in apps/assistant, which starts a local database.",
      );
    }
    const pool = new Pool({ connectionString, ...POOL_OPTIONS });
    attachDatabasePool(pool);
    db = drizzle({ client: pool, schema });
  }
  return db;
}
