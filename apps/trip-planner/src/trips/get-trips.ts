import { cache } from "react";
import "server-only";
import { getPageSession } from "#src/auth/get-page-session.ts";
import { getTripsDb } from "#src/db/get-trips-db.ts";
import { readTrips, type ViewedTrip } from "./read-trips.ts";

/** The signed-in user of this request, or null. Read once for each request. */
export const getViewerId = cache(
  async (): Promise<string | null> => (await getPageSession())?.userId ?? null,
);

/** The trips that the signed-in user is a member of, read once for each request. */
export const getTrips = cache(async (): Promise<ViewedTrip[]> =>
  readTrips(getTripsDb(), await getViewerId()),
);

/** The trip at the path `/<id>`, when the signed-in user is a member of it. */
export async function getTrip(id: string): Promise<ViewedTrip | undefined> {
  return (await getTrips()).find((viewed) => viewed.id === id);
}
