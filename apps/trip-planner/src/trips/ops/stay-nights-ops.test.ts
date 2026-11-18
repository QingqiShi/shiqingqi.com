import { describe, expect, it } from "vitest";
import {
  applyOps,
  withExpect,
  type DraftOp,
} from "#src/trips/ops/apply-ops.ts";
import { newTrip } from "#src/trips/ops/new-trip.ts";
import type { Trip } from "#src/trips/types.ts";
import {
  endRepeatsOps,
  mostNightsAt,
  nightsAt,
  removeItemOps,
  stayNightsOps,
} from "./stay-nights-ops.ts";

function applied(trip: Trip, ops: readonly DraftOp[]): Trip {
  const result = applyOps(trip, withExpect(trip, ops));
  if (result.status !== "applied") throw new Error(JSON.stringify(result));
  return result.trip;
}

const empty = newTrip({
  title: "Test trip",
  firstDate: "2027-04-16",
  days: 5,
  timeZone: "Europe/Lisbon",
  language: "en",
});
const [one, two, three, four, five] = empty.days.map((day) => day.id);

/** A hotel on day one and a hostel on day four. */
const start = applied(empty, [
  {
    op: "addItem",
    to: { dayId: one, list: "lodging" },
    item: { id: "hotel", type: "lodging", name: "Hotel" },
  },
  {
    op: "addItem",
    to: { dayId: four, list: "lodging" },
    item: { id: "hostel", type: "lodging", name: "Hostel" },
  },
]);
const hotel = (nights: number) => ({ dayId: one, nights, name: "Hotel" });

const bedsOf = (trip: Trip) =>
  trip.days.map((day) => day.stay.sameAs?.dayId ?? null);

describe("stayNightsOps", () => {
  it("makes the later nights repeat the day, and ends them when the stay gets shorter", () => {
    expect(mostNightsAt(start, one)).toBe(3);
    const long = applied(start, stayNightsOps(start, hotel(3)));
    expect(bedsOf(long)).toEqual([null, one, one, null, null]);
    expect(nightsAt(long, one)).toBe(3);

    const short = applied(long, stayNightsOps(long, hotel(2)));
    expect(bedsOf(short)).toEqual([null, one, null, null, null]);
    expect(stayNightsOps(short, hotel(2))).toEqual([]);
  });

  it("keeps a later return to the same bed when the first stay gets shorter", () => {
    const back = applied(start, [
      ...stayNightsOps(start, hotel(2)),
      {
        op: "setStay",
        dayId: five,
        fields: { sameAs: { dayId: one, label: "Hotel again" } },
      },
    ]);
    const short = applied(back, stayNightsOps(back, hotel(1)));
    expect(bedsOf(short)).toEqual([null, null, null, null, one]);
  });

  it("keeps a label that a person wrote, and renames a label that was the name", () => {
    const linked = applied(start, [
      ...stayNightsOps(start, hotel(2)),
      {
        op: "setStay",
        dayId: three,
        fields: { sameAs: { dayId: one, label: "The last night there" } },
      },
    ]);
    const renamed = applied(
      linked,
      stayNightsOps(linked, {
        dayId: one,
        nights: 3,
        name: "Grand Hotel",
        earlierName: "Hotel",
      }),
    );
    expect(renamed.days.map((day) => day.stay.sameAs?.label)).toEqual([
      undefined,
      "Grand Hotel",
      "The last night there",
      undefined,
      undefined,
    ]);
  });

  it("moves a stay of three nights to a later day, with its nights", () => {
    const long = applied(start, stayNightsOps(start, hotel(3)));
    const moved = (dayId: string, nights: number) =>
      applied(long, [
        {
          op: "moveItem",
          id: "hotel",
          to: { dayId, list: "lodging" },
        } as const,
        ...stayNightsOps(long, {
          dayId,
          nights,
          name: "Hotel",
          earlierName: "Hotel",
          leftDayId: one,
        }),
      ]);
    expect(bedsOf(moved(two, 2))).toEqual([null, null, two, null, null]);
    expect(bedsOf(moved(three, 1))).toEqual([null, null, null, null, null]);
  });
});

describe("endRepeatsOps", () => {
  it("ends each repeat of the day, also one that repeats it through a different night", () => {
    const chained = applied(start, [
      ...stayNightsOps(start, hotel(2)),
      {
        op: "setStay",
        dayId: three,
        fields: { sameAs: { dayId: two, label: "Hotel" } },
      },
      {
        op: "setStay",
        dayId: five,
        fields: { sameAs: { dayId: four, label: "Hostel" } },
      },
    ]);
    const ended = applied(chained, endRepeatsOps(chained, one));
    expect(bedsOf(ended)).toEqual([null, null, null, null, four]);
  });
});

describe("removeItemOps", () => {
  const long = applied(start, stayNightsOps(start, hotel(3)));

  it("ends the later nights of the only stay of a day", () => {
    const removed = applied(long, removeItemOps(long, "hotel"));
    expect(bedsOf(removed)).toEqual([null, null, null, null, null]);
  });

  it("keeps the later nights while the day has another stay", () => {
    const twoStays = applied(long, [
      {
        op: "addItem",
        to: { dayId: one, list: "lodging" },
        item: { id: "inn", type: "lodging", name: "Inn" },
      },
    ]);
    const removed = applied(twoStays, removeItemOps(twoStays, "hotel"));
    expect(bedsOf(removed)).toEqual([null, one, one, null, null]);
  });
});
