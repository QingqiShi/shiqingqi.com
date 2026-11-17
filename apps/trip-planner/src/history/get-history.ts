import "server-only";
import { getTripsDb } from "#src/db/get-trips-db.ts";
import { getViewerId } from "#src/trips/get-trips.ts";
import { tripHistory } from "./trip-history.ts";

/** The history of a trip for the pages, as the signed-in user: null when the user cannot change the trip. */
export const getHistory = {
  /** The versions of the trip, newest first. */
  async versions(tripId: string) {
    const viewerId = await getViewerId();
    if (viewerId === null) return null;
    return tripHistory.list(getTripsDb(), viewerId, tripId);
  },

  /** One version of the trip, with the newest one. */
  async version(tripId: string, revision: number) {
    const viewerId = await getViewerId();
    if (viewerId === null) return null;
    return tripHistory.read(getTripsDb(), viewerId, tripId, revision);
  },
};
