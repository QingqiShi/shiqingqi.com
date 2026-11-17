import { isDeepStrictEqual } from "node:util";
import { eq, max } from "drizzle-orm";
import { tripRevisions, trips } from "#src/db/schema.ts";
import type { TripsDb } from "#src/db/types.ts";
import { tripSchema } from "./trip-schema.ts";

/**
 * Saves a trip document as the newest revision of the trip with this id,
 * and makes the trip when it is not there. A document that fails the schema
 * is refused. A document that any revision of the trip already holds adds
 * nothing, so that a seed of an older commit does not put an older document
 * back over a newer one.
 */
export async function importTrip(
  db: TripsDb,
  tripId: string,
  document: unknown,
): Promise<"created" | "revised" | "known"> {
  const trip = tripSchema.parse(document);
  return db.transaction(async (tx) => {
    await tx.insert(trips).values({ id: tripId }).onConflictDoNothing();
    await tx
      .select({ id: trips.id })
      .from(trips)
      .where(eq(trips.id, tripId))
      .for("update");
    const revisions = await tx
      .select({ document: tripRevisions.document })
      .from(tripRevisions)
      .where(eq(tripRevisions.tripId, tripId));
    // A revision from a build with another schema can fail this schema. It
    // is then not the same document.
    const isKnown = revisions.some((revision) => {
      const stored = tripSchema.safeParse(revision.document);
      return stored.success && isDeepStrictEqual(stored.data, trip);
    });
    if (isKnown) return "known";
    const [{ newest }] = await tx
      .select({ newest: max(tripRevisions.revision) })
      .from(tripRevisions)
      .where(eq(tripRevisions.tripId, tripId));
    await tx
      .insert(tripRevisions)
      .values({ tripId, revision: (newest ?? 0) + 1, document: trip });
    return newest === null ? "created" : "revised";
  });
}
