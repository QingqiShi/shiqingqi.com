import { and, desc, eq, gt, lte, sql } from "drizzle-orm";
import { tripInvites, tripMembers } from "#src/db/schema.ts";
import type { TripsDb } from "#src/db/types.ts";
import { asViewer } from "#src/trips/as-viewer.ts";
import { inviteToken } from "./invite-token.ts";

const MAX_OPEN_INVITES = 10;
const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

export interface TripInvite {
  id: string;
  expiresAt: Date;
}

export interface TripMember {
  userId: string;
  email: string;
  role: "owner" | "editor";
}

/**
 * The open invites of a trip, the one that ends last first. Row-level
 * security gives them only to an owner of the trip; any other user gets
 * none.
 */
function listInvites(
  db: TripsDb,
  userId: string,
  tripId: string,
  now: Date,
): Promise<TripInvite[]> {
  return asViewer(db, userId, (tx) =>
    tx
      .select({ id: tripInvites.id, expiresAt: tripInvites.expiresAt })
      .from(tripInvites)
      .where(
        and(eq(tripInvites.tripId, tripId), gt(tripInvites.expiresAt, now)),
      )
      .orderBy(desc(tripInvites.expiresAt), tripInvites.id),
  );
}

/**
 * Makes an invite for a trip and gives its token, which is not stored and
 * cannot be read again. Row-level security lets only an owner of the trip
 * add the row; the check here gives a clear answer.
 */
async function createInvite(
  db: TripsDb,
  userId: string,
  tripId: string,
  now: Date,
): Promise<{ invite: TripInvite; token: string } | "forbidden" | "full"> {
  const token = inviteToken.create();
  return asViewer(db, userId, async (tx) => {
    // The role sees only the member rows of this user.
    const owned = await tx
      .select({ tripId: tripMembers.tripId })
      .from(tripMembers)
      .where(
        and(eq(tripMembers.tripId, tripId), eq(tripMembers.role, "owner")),
      );
    if (owned.length === 0) return "forbidden";
    await tx
      .delete(tripInvites)
      .where(
        and(eq(tripInvites.tripId, tripId), lte(tripInvites.expiresAt, now)),
      );
    const open = await tx.$count(tripInvites, eq(tripInvites.tripId, tripId));
    if (open >= MAX_OPEN_INVITES) return "full";
    const [invite] = await tx
      .insert(tripInvites)
      .values({
        tripId,
        createdBy: userId,
        tokenHash: inviteToken.hash(token),
        expiresAt: new Date(now.getTime() + INVITE_LIFETIME_MS),
      })
      .returning({ id: tripInvites.id, expiresAt: tripInvites.expiresAt });
    return { invite, token };
  });
}

/** Ends an invite. Row-level security lets only an owner of its trip do it. */
async function endInvite(
  db: TripsDb,
  userId: string,
  inviteId: string,
): Promise<boolean> {
  const ended = await asViewer(db, userId, (tx) =>
    tx
      .delete(tripInvites)
      .where(eq(tripInvites.id, inviteId))
      .returning({ id: tripInvites.id }),
  );
  return ended.length > 0;
}

/** True while a person can join with the token. An invite that ended and one that never was give the same answer. */
async function isInviteOpen(db: TripsDb, token: string): Promise<boolean> {
  if (!inviteToken.isValid(token)) return false;
  const [{ open }] = await asViewer(db, null, (tx) =>
    tx
      .select({ open: sql<boolean>`open` })
      .from(
        sql`public.trips_invite_is_open(${inviteToken.hash(token)}) as open`,
      ),
  );
  return open;
}

/**
 * Makes the user an editor of the trip of an open invite, which ends the
 * invite, and gives the slug of the trip. A user who is a member already
 * keeps the role, and the invite stays open for another person. Null when
 * the invite is not open.
 */
async function acceptInvite(
  db: TripsDb,
  userId: string,
  token: string,
): Promise<string | null> {
  if (!inviteToken.isValid(token)) return null;
  const [{ slug }] = await asViewer(db, userId, (tx) =>
    tx
      .select({ slug: sql<string | null>`slug` })
      .from(
        sql`public.trips_accept_invite(${inviteToken.hash(token)}) as slug`,
      ),
  );
  return slug;
}

/** The members of a trip, owners first. Only an owner of the trip gets any. */
async function listMembers(
  db: TripsDb,
  userId: string,
  tripId: string,
): Promise<TripMember[]> {
  return asViewer(db, userId, (tx) =>
    tx
      .select({
        userId: sql<string>`user_id`,
        email: sql<string>`email`,
        role: sql<TripMember["role"]>`role`,
      })
      .from(sql`public.trips_members_of(${tripId})`)
      .orderBy(sql`role = 'owner' desc, joined_at, user_id`),
  );
}

/** Takes an editor out of a trip. Only an owner of the trip does it, and an owner stays. */
async function removeMember(
  db: TripsDb,
  userId: string,
  tripId: string,
  memberId: string,
): Promise<boolean> {
  const [{ removed }] = await asViewer(db, userId, (tx) =>
    tx
      .select({ removed: sql<boolean>`removed` })
      .from(sql`public.trips_remove_member(${tripId}, ${memberId}) as removed`),
  );
  return removed;
}

/**
 * The ids of the trips that only this user owns, which a deletion of the
 * user's account deletes for every member.
 */
async function listTripsOwnedAlone(
  db: TripsDb,
  userId: string,
): Promise<string[]> {
  const rows = await asViewer(db, userId, (tx) =>
    tx
      .select({ tripId: sql<string>`trip_id` })
      .from(sql`public.trips_viewer_owns_alone() as trip_id`),
  );
  return rows.map(({ tripId }) => tripId);
}

/** Who is on a trip and who can join it. Each function runs as the user, under row-level security. */
export const tripSharing = {
  maxOpenInvites: MAX_OPEN_INVITES,
  listInvites,
  createInvite,
  endInvite,
  isInviteOpen,
  acceptInvite,
  listMembers,
  removeMember,
  listTripsOwnedAlone,
};
