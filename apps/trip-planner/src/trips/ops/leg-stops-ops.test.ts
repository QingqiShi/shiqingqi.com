import { describe, expect, it } from "vitest";
import {
  applyOps,
  withExpect,
  type DraftOp,
} from "#src/trips/ops/apply-ops.ts";
import { findItem } from "#src/trips/ops/find-item.ts";
import { newTrip } from "#src/trips/ops/new-trip.ts";
import type { Trip } from "#src/trips/types.ts";
import { legStopsOps } from "./leg-stops-ops.ts";

function applied(trip: Trip, ops: readonly DraftOp[]): Trip {
  const result = applyOps(trip, withExpect(trip, ops));
  if (result.status !== "applied") throw new Error(JSON.stringify(result));
  return result.trip;
}

const empty = newTrip({
  title: "Test trip",
  firstDate: "2027-04-16",
  days: 1,
  timeZone: "Europe/Lisbon",
  language: "en",
});

const start = applied(empty, [
  {
    op: "addMoment",
    dayId: empty.days[0].id,
    moment: { id: "morning", time: "09:00" },
  },
  {
    op: "addItem",
    to: { momentId: "morning" },
    item: { id: "leg", type: "nav", label: "To Sintra", to: "Sintra" },
  },
]);

function legOf(trip: Trip) {
  const found = findItem(trip, "leg");
  if (found?.item.type !== "nav") throw new Error("No leg");
  return found.item;
}

describe("leg stops", () => {
  it("adds stops in order, and a leg with its last stop taken out has no stops", () => {
    const one = applied(start, legStopsOps(legOf(start), { add: "  Queluz " }));
    const two = applied(one, legStopsOps(legOf(one), { add: "Cascais" }));
    expect(legOf(two).waypoints).toEqual(["Queluz", "Cascais"]);

    const back = applied(two, legStopsOps(legOf(two), { remove: 0 }));
    expect(legOf(back).waypoints).toEqual(["Cascais"]);
    const none = applied(back, legStopsOps(legOf(back), { remove: 0 }));
    expect(legOf(none)).not.toHaveProperty("waypoints");
  });

  it("makes no change for a blank stop or a stop that is not there", () => {
    expect(legStopsOps(legOf(start), { add: "   " })).toEqual([]);
    expect(legStopsOps(legOf(start), { remove: 0 })).toEqual([]);
  });
});
