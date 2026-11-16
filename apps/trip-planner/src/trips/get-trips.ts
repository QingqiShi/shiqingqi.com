import { cache } from "react";
import "server-only";
import { getTripsDb } from "#src/db/get-trips-db.ts";
import { readTrips } from "./read-trips.ts";
import type { Trip } from "./types.ts";

/** The trips that a page can show, read once for each request. */
export const getTrips = cache((): Promise<Trip[]> => readTrips(getTripsDb()));

export async function getTrip(slug: string): Promise<Trip | undefined> {
  return (await getTrips()).find((trip) => trip.slug === slug);
}
