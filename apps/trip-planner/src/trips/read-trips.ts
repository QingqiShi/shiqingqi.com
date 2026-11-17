import { desc, sql } from "drizzle-orm";
import { tripRevisions } from "#src/db/schema.ts";
import type { TripsDb } from "#src/db/types.ts";
import { tripSchema } from "./trip-schema.ts";
import type { Trip } from "./types.ts";

/**
 * The trips that the user is a member of, soonest departure first. A visitor
 * who is not signed in has none.
 *
 * The query has no filter of its own: it runs as `trips_app`, and row-level
 * security gives that role only the trips of the user in `trips.user_id`.
 * Both settings end with the transaction, so they never reach another
 * request on a pooled connection.
 */
export async function readTrips(
  db: TripsDb,
  userId: string | null,
): Promise<Trip[]> {
  if (userId === null) return [];
  const rows = await db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('role', 'trips_app', true), set_config('trips.user_id', ${userId}, true)`,
    );
    return tx
      .selectDistinctOn([tripRevisions.tripId], {
        document: tripRevisions.document,
      })
      .from(tripRevisions)
      .orderBy(tripRevisions.tripId, desc(tripRevisions.revision));
  });
  return rows
    .map((row) => tripSchema.parse(row.document))
    .sort((a, b) => a.days[0].date.localeCompare(b.days[0].date));
}
