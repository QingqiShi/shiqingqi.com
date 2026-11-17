import type { Stay } from "#src/trips/types.ts";

/** What to call the bed of a night: its summary, else the name of its first lodging, else the night it repeats. */
export function stayName(stay: Stay): string | undefined {
  return stay.summary ?? stay.lodging.at(0)?.name ?? stay.sameAs?.label;
}
