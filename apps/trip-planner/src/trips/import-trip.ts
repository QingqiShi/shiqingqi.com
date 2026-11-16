import { isDeepStrictEqual } from "node:util";
import { eq, max } from "drizzle-orm";
import { tripRevisions, trips } from "#src/db/schema.ts";
import type { TripsDb } from "#src/db/types.ts";
import { tripSchema } from "./trip-schema.ts";

/**
 * Saves a trip document under its slug as the newest revision. A document
 * that fails the schema is refused. A document that any revision of the trip
 * already holds adds nothing, so that a build of an older commit does not put
 * an older document back over a newer one.
 */
export async function importTrip(
  db: TripsDb,
  document: unknown,
): Promise<"created" | "revised" | "known"> {
  const trip = tripSchema.parse(document);
  return db.transaction(async (tx) => {
    await tx.insert(trips).values({ slug: trip.slug }).onConflictDoNothing();
    const [{ id }] = await tx
      .select({ id: trips.id })
      .from(trips)
      .where(eq(trips.slug, trip.slug))
      .for("update");
    const revisions = await tx
      .select({ document: tripRevisions.document })
      .from(tripRevisions)
      .where(eq(tripRevisions.tripId, id));
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
      .where(eq(tripRevisions.tripId, id));
    await tx
      .insert(tripRevisions)
      .values({ tripId: id, revision: (newest ?? 0) + 1, document: trip });
    return newest === null ? "created" : "revised";
  });
}
