import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import "server-only";
import { schema } from "./schema.ts";
import type { BuddyDb } from "./types.ts";

let db: BuddyDb | null = null;

/**
 * The database of accounts, machines and the archive, or null when
 * `BUDDY_DATABASE_URL` is not set. Only sign-in, the owner's pages, the
 * connect flow, the removal of a Mac and the cron use it; uploads and the public
 * page read Redis.
 */
export function getBuddyDb(): BuddyDb | null {
  const connectionString = process.env.BUDDY_DATABASE_URL;
  if (!connectionString) return null;
  if (!db) {
    const pool = new Pool({
      connectionString,
      max: 3,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 5_000,
    });
    attachDatabasePool(pool);
    db = drizzle({ client: pool, schema });
  }
  return db;
}
