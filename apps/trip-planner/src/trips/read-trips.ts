import { desc, eq } from "drizzle-orm";
import { tripMembers, tripRevisions } from "#src/db/schema.ts";
import type { TripsDb } from "#src/db/types.ts";
import { asViewer } from "./as-viewer.ts";
import { tripSchema } from "./trip-schema.ts";
import type { Trip } from "./types.ts";

export interface ViewedTrip {
  id: string;
  trip: Trip;
  role: "owner" | "editor";
}

/**
 * The trips that the user is a member of, soonest departure first. A visitor
 * who is not signed in has none.
 *
 * The query has no filter of its own: row-level security gives `trips_app`
 * only the revisions of the user's trips, and only the user's own member
 * rows.
 */
export async function readTrips(
  db: TripsDb,
  userId: string | null,
): Promise<ViewedTrip[]> {
  if (userId === null) return [];
  const rows = await asViewer(db, userId, (tx) =>
    tx
      .selectDistinctOn([tripRevisions.tripId], {
        id: tripRevisions.tripId,
        document: tripRevisions.document,
        role: tripMembers.role,
      })
      .from(tripRevisions)
      .innerJoin(tripMembers, eq(tripMembers.tripId, tripRevisions.tripId))
      .orderBy(tripRevisions.tripId, desc(tripRevisions.revision)),
  );
  return rows
    .map((row) => ({
      id: row.id,
      trip: tripSchema.parse(row.document),
      role: row.role,
    }))
    .sort((a, b) => a.trip.days[0].date.localeCompare(b.trip.days[0].date));
}
