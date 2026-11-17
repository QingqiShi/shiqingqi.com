import { and, desc, eq, sql } from "drizzle-orm";
import { tripMembers, tripRevisions } from "#src/db/schema.ts";
import type { TripsDb } from "#src/db/types.ts";
import { asViewer } from "#src/trips/as-viewer.ts";
import { canEditTrip } from "#src/trips/can-edit-trip.ts";
import { tripSchema } from "#src/trips/trip-schema.ts";
import type { Trip } from "#src/trips/types.ts";
import { isSerializationFailure } from "#src/trips/write-trips.ts";

/** A saved version of a trip, as a member who can change the trip sees it. */
export interface TripVersion {
  revision: number;
  /** When the version was last saved. */
  savedAt: Date;
  /** `savedAt` as Postgres text, which keeps the microseconds that a `Date` drops: the guard of a restore. */
  stamp: string;
  /** Who saved it: the viewer, another member, or nobody known (an imported trip, or a user who left). */
  author: "you" | "member" | "unknown";
  /** Null for a document that this build cannot read. */
  trip: Trip | null;
}

export type RestoreResult =
  | { status: "restored"; revision: number }
  /** The trip changed after the person read it, or the version is gone. */
  | { status: "conflict" }
  /** No trip with this id that the user can change. */
  | { status: "not_found" };

type Transaction = Parameters<Parameters<typeof asViewer>[2]>[0];

/** Whether the viewer is an owner or an editor of the trip. Row-level security shows only the viewer's own member row. */
async function canEdit(tx: Transaction, tripId: string) {
  const members = await tx
    .select({ role: tripMembers.role })
    .from(tripMembers)
    .where(eq(tripMembers.tripId, tripId));
  return members.some((member) => canEditTrip(member.role));
}

function versionOf(
  userId: string,
  row: {
    revision: number;
    savedAt: Date;
    stamp: string;
    authorId: string | null;
    document: unknown;
  },
): TripVersion {
  const parsed = tripSchema.safeParse(row.document);
  return {
    revision: row.revision,
    savedAt: row.savedAt,
    stamp: row.stamp,
    author:
      row.authorId === null
        ? "unknown"
        : row.authorId === userId
          ? "you"
          : "member",
    trip: parsed.success ? parsed.data : null,
  };
}

const columns = {
  revision: tripRevisions.revision,
  savedAt: tripRevisions.updatedAt,
  stamp: sql<string>`${tripRevisions.updatedAt}::text`,
  authorId: tripRevisions.authorId,
  document: tripRevisions.document,
};

/** The versions of a trip, newest first, or null when the user cannot change the trip. */
async function list(
  db: TripsDb,
  userId: string,
  tripId: string,
): Promise<TripVersion[] | null> {
  return asViewer(db, userId, async (tx) => {
    if (!(await canEdit(tx, tripId))) return null;
    const rows = await tx
      .select(columns)
      .from(tripRevisions)
      .where(eq(tripRevisions.tripId, tripId))
      .orderBy(desc(tripRevisions.revision));
    return rows.map((row) => versionOf(userId, row));
  });
}

/**
 * One version of a trip, with the newest version, which a restore must name
 * as the one that the person saw. Null when the user cannot change the trip
 * or the version is not there.
 */
async function read(
  db: TripsDb,
  userId: string,
  tripId: string,
  revision: number,
): Promise<{ version: TripVersion; newest: TripVersion } | null> {
  return asViewer(db, userId, async (tx) => {
    if (!(await canEdit(tx, tripId))) return null;
    const newestRows = await tx
      .select(columns)
      .from(tripRevisions)
      .where(eq(tripRevisions.tripId, tripId))
      .orderBy(desc(tripRevisions.revision))
      .limit(1);
    const rows = await tx
      .select(columns)
      .from(tripRevisions)
      .where(
        and(
          eq(tripRevisions.tripId, tripId),
          eq(tripRevisions.revision, revision),
        ),
      );
    const newest = newestRows.at(0);
    const row = rows.at(0);
    if (!newest || !row) return null;
    return {
      version: versionOf(userId, row),
      newest: versionOf(userId, newest),
    };
  });
}

/**
 * Puts an older version of a trip back as its newest version, as the user
 * (`trips_restore`). `seen` is the newest version that the person saw: when
 * the trip changed since, nothing changes and the answer is a conflict.
 */
async function restore(
  db: TripsDb,
  userId: string,
  tripId: string,
  seen: { revision: number; stamp: string },
  revision: number,
): Promise<RestoreResult> {
  try {
    const [{ restored }] = await asViewer(db, userId, (tx) =>
      tx
        .select({ restored: sql<number | null>`restored` })
        .from(
          sql`public.trips_restore(${tripId}, ${seen.revision}, ${seen.stamp}::timestamptz, ${revision}) as restored`,
        ),
    );
    return restored === null
      ? { status: "not_found" }
      : { status: "restored", revision: restored };
  } catch (error) {
    if (isSerializationFailure(error)) return { status: "conflict" };
    throw error;
  }
}

/** The versions of a trip, for the members who can change it. Each function runs as the user, and the database checks that the user may do it. */
export const tripHistory = { list, read, restore };
