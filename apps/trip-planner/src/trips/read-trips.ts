import { desc, eq, inArray } from "drizzle-orm";
import { tripRevisions, trips } from "#src/db/schema.ts";
import type { TripsDb } from "#src/db/types.ts";
import { gatedSlugs } from "#src/trip-gate.ts";
import { tripSchema } from "./trip-schema.ts";
import type { Trip } from "./types.ts";

/**
 * Every trip that has a password gate, soonest departure first. A trip with
 * no gate, or a gate with no password, does not leave the database: until
 * trips have members, the gate is all that keeps a trip private.
 */
export async function readTrips(db: TripsDb): Promise<Trip[]> {
  const slugs = gatedSlugs();
  if (slugs.length === 0) return [];
  const rows = await db
    .selectDistinctOn([tripRevisions.tripId], {
      document: tripRevisions.document,
    })
    .from(tripRevisions)
    .innerJoin(trips, eq(trips.id, tripRevisions.tripId))
    .where(inArray(trips.slug, slugs))
    .orderBy(tripRevisions.tripId, desc(tripRevisions.revision));
  return rows
    .map((row) => tripSchema.parse(row.document))
    .sort((a, b) => a.days[0].date.localeCompare(b.days[0].date));
}
