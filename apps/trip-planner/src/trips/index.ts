import gbData from "./data/gb.json";
import tuscanyData from "./data/tuscany.json";
import sampleData from "./testing/sample-trip.json";
import { tripSchema } from "./trip-schema";
import type { Trip } from "./types";

// The made-up trip exists only where its password is set, as in the
// end-to-end tests. Production does not set it, so there it has no page.
const sample = process.env.SITE_PASSWORD_SAMPLE ? [sampleData] : [];

/** Every trip the planner knows about, soonest departure first — drives the
 *  trip list. Each slug must also have a password gate in
 *  `src/trip-gate.ts`. */
export const trips: Trip[] = [tuscanyData, gbData, ...sample].map((data) =>
  tripSchema.parse(data),
);

export function tripBySlug(slug: string): Trip | undefined {
  return trips.find((trip) => trip.slug === slug);
}
