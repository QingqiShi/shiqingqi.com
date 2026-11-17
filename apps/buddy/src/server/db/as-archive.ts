import { runTransaction } from "@tuja/server-db/run-transaction";
import { sql } from "drizzle-orm";
import type { LimitedTx } from "./as-viewer.ts";
import type { BuddyDb } from "./types.ts";

/**
 * Runs queries as `buddy_archive`, the role of the daily cron. It reads
 * every account and Mac, but no email and no table of sign-in, and it
 * writes only the visitor counts and the usage days.
 */
export function asArchive<T>(
  db: BuddyDb,
  run: (tx: LimitedTx) => Promise<T>,
): Promise<T> {
  return runTransaction(db, async (tx) => {
    await tx.execute(sql`select set_config('role', 'buddy_archive', true)`);
    return run(tx);
  });
}
