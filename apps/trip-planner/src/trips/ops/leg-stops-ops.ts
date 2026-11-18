import type { DraftOp } from "./apply-ops.ts";
import type { Item } from "./op-schema.ts";

type Leg = Extract<Item, { type: "nav" }>;

/** A stop to add at the end of the stops of a leg, or the place of a stop to take out. */
export type StopChange = { add: string } | { remove: number };

/**
 * The ops that add a stop at the end of the stops of a leg, or take one out.
 * Text that is only space adds nothing, and a leg with no stop left has no
 * list of stops.
 */
export function legStopsOps(leg: Leg, change: StopChange): DraftOp[] {
  const stops = leg.waypoints ?? [];
  let next: string[];
  if ("add" in change) {
    const name = change.add.trim();
    if (name === "") return [];
    next = [...stops, name];
  } else {
    if (change.remove < 0 || change.remove >= stops.length) return [];
    next = stops.filter((_, at) => at !== change.remove);
  }
  return [
    {
      op: "setItem",
      id: leg.id,
      fields: { waypoints: next.length > 0 ? next : null },
    },
  ];
}
