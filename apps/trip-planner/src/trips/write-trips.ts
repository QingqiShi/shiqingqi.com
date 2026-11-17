import { desc, eq, sql } from "drizzle-orm";
import { tripRevisions } from "#src/db/schema.ts";
import type { TripsDb } from "#src/db/types.ts";
import { asViewer } from "./as-viewer.ts";
import { applyOps, type ApplyResult } from "./ops/apply-ops.ts";
import { newTrip, type NewTrip } from "./ops/new-trip.ts";
import type { Op } from "./ops/op-schema.ts";
import { tripSchema } from "./trip-schema.ts";
import type { Trip } from "./types.ts";

export type ChangeResult =
  | { status: "applied"; revision: number; trip: Trip }
  | Exclude<ApplyResult, { status: "applied" }>
  /** No trip with this id that the user is a member of. */
  | { status: "not_found" };

const SAVE_ATTEMPTS = 5;

/**
 * Applies a batch of ops to the newest revision of a trip and saves the
 * result, as the user. The database lets only an owner or an editor of the
 * trip save (`trips_save`). When another save of the trip comes between the
 * read and the save, it reads and applies again, so that neither save is
 * lost; the `expect` of each op then finds a change to the same thing.
 */
async function change(
  db: TripsDb,
  userId: string,
  tripId: string,
  ops: readonly Op[],
): Promise<ChangeResult> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await asViewer(db, userId, async (tx) => {
        const rows = await tx
          .select({
            revision: tripRevisions.revision,
            document: tripRevisions.document,
            // As text, which keeps the microseconds that a `Date` drops.
            updatedAt: sql<string>`${tripRevisions.updatedAt}::text`,
          })
          .from(tripRevisions)
          .where(eq(tripRevisions.tripId, tripId))
          .orderBy(desc(tripRevisions.revision))
          .limit(1);
        const newest = rows.at(0);
        if (!newest) return { status: "not_found" } as const;
        const result = applyOps(tripSchema.parse(newest.document), ops);
        if (result.status !== "applied") return result;
        const [{ saved }] = await tx
          .select({ saved: sql<number | null>`saved` })
          .from(
            sql`public.trips_save(${tripId}, ${newest.revision}, ${newest.updatedAt}::timestamptz, ${JSON.stringify(result.trip)}::jsonb) as saved`,
          );
        if (saved === null) return { status: "not_found" } as const;
        return { status: "applied", revision: saved, trip: result.trip };
      });
    } catch (error) {
      if (attempt < SAVE_ATTEMPTS && isSerializationFailure(error)) continue;
      throw error;
    }
  }
}

/** Makes a trip with the user as its owner, and gives its id. */
async function create(
  db: TripsDb,
  userId: string,
  input: NewTrip,
): Promise<string> {
  const [{ tripId }] = await asViewer(db, userId, (tx) =>
    tx
      .select({ tripId: sql<string | null>`trip_id` })
      .from(
        sql`public.trips_create(${JSON.stringify(newTrip(input))}::jsonb) as trip_id`,
      ),
  );
  if (tripId === null) throw new Error("No user to own the trip.");
  return tripId;
}

/** Deletes a trip with all that it has. Only an owner of the trip can; any other user gets false. */
async function remove(
  db: TripsDb,
  userId: string,
  tripId: string,
): Promise<boolean> {
  const [{ deleted }] = await asViewer(db, userId, (tx) =>
    tx
      .select({ deleted: sql<boolean>`deleted` })
      .from(sql`public.trips_delete(${tripId}) as deleted`),
  );
  return deleted;
}

function isSerializationFailure(error: unknown): boolean {
  for (let cause = error; cause instanceof Error; cause = cause.cause) {
    if ("code" in cause && cause.code === "40001") return true;
  }
  return false;
}

/**
 * The one way to change the trip tables. Each function runs as the user,
 * and the database checks that the user may do it.
 */
export const writeTrips = { change, create, remove };
