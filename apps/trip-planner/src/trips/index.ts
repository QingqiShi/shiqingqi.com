import gbData from "./data/gb.json";
import tuscanyData from "./data/tuscany.json";
import { tripSchema } from "./trip-schema";
import type { Trip } from "./types";

/** Every trip the planner knows about, soonest departure first — drives the
 *  home picker. Each slug must also have a password gate in
 *  `src/trip-gate.ts`. */
export const trips: Trip[] = [tuscanyData, gbData].map((data) =>
  tripSchema.parse(data),
);

export function tripBySlug(slug: string): Trip | undefined {
  return trips.find((trip) => trip.slug === slug);
}
