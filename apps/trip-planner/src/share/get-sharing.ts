import "server-only";
import { getTripsDb } from "#src/db/get-trips-db.ts";
import {
  tripSharing,
  type TripInvite,
  type TripMember,
} from "./trip-sharing.ts";

/** The members and the open invites of a trip, for one of its owners. Any other user gets none. */
export async function getSharing(
  userId: string,
  tripId: string,
): Promise<{ members: TripMember[]; invites: TripInvite[] }> {
  const db = getTripsDb();
  const [members, invites] = await Promise.all([
    tripSharing.listMembers(db, userId, tripId),
    tripSharing.listInvites(db, userId, tripId, new Date()),
  ]);
  return { members, invites };
}

/** True while a person can join a trip with the token of this invite link. */
export function isInviteOpen(token: string): Promise<boolean> {
  return tripSharing.isInviteOpen(getTripsDb(), token);
}

/** The ids of the trips that a deletion of the user's account deletes: those that no other user owns. */
export function getTripsOwnedAlone(userId: string): Promise<string[]> {
  return tripSharing.listTripsOwnedAlone(getTripsDb(), userId);
}
