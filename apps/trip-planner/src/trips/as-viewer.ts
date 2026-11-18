import { runTransaction } from "@tuja/server-db/run-transaction";
import { sql } from "drizzle-orm";
import type { TripsDb } from "#src/db/types.ts";

export type Transaction = Parameters<Parameters<TripsDb["transaction"]>[0]>[0];

/**
 * Runs queries as `trips_app`, the role that row-level security limits to
 * the rows of this user. The role and the setting end with the transaction,
 * so they never reach another request on a pooled connection.
 */
export function asViewer<T>(
  db: TripsDb,
  userId: string | null,
  run: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return runTransaction(db, async (tx) => {
    await tx.execute(
      sql`select set_config('role', 'trips_app', true), set_config('trips.user_id', ${userId ?? ""}, true)`,
    );
    return run(tx);
  });
}
