import { cache } from "react";
import "server-only";
import { getPageSession } from "#src/auth/get-page-session.ts";
import { getTripsDb } from "#src/db/get-trips-db.ts";
import { readTrips } from "./read-trips.ts";
import type { Trip } from "./types.ts";

/** The signed-in user of this request, or null. Read once for each request. */
export const getViewerId = cache(
  async (): Promise<string | null> => (await getPageSession())?.userId ?? null,
);

/** The trips that the signed-in user is a member of, read once for each request. */
export const getTrips = cache(async (): Promise<Trip[]> =>
  readTrips(getTripsDb(), await getViewerId()),
);

export async function getTrip(slug: string): Promise<Trip | undefined> {
  return (await getTrips()).find((trip) => trip.slug === slug);
}
