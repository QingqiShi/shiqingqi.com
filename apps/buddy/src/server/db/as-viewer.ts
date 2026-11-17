import { runTransaction } from "@tuja/server-db/run-transaction";
import { sql } from "drizzle-orm";
import type { BuddyDb } from "./types.ts";

export type LimitedTx = Parameters<Parameters<BuddyDb["transaction"]>[0]>[0];

/**
 * Runs queries as `buddy_app`, the role that row-level security limits to
 * the rows of this account. The role and the setting end with the
 * transaction, so they never reach another request on a pooled connection.
 */
export function asViewer<T>(
  db: BuddyDb,
  userId: string | null,
  run: (tx: LimitedTx) => Promise<T>,
): Promise<T> {
  return runTransaction(db, async (tx) => {
    await tx.execute(
      sql`select set_config('role', 'buddy_app', true), set_config('buddy.user_id', ${userId ?? ""}, true)`,
    );
    return run(tx);
  });
}
