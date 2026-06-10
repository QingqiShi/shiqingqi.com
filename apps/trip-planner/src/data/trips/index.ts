import type { Trip } from "../types";
import { gb } from "./gb";
import { tuscany } from "./tuscany";

/** Every trip the planner knows about, soonest departure first — drives the
 *  home picker. Each slug must also have a password gate in `src/proxy.ts`. */
export const trips: Trip[] = [tuscany, gb];

export function tripBySlug(slug: string): Trip | undefined {
  return trips.find((trip) => trip.slug === slug);
}
