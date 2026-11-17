import { describe, expect, it } from "vitest";
import {
  applyOps,
  withExpect,
  type DraftOp,
} from "#src/trips/ops/apply-ops.ts";
import { newTrip } from "#src/trips/ops/new-trip.ts";
import type { Trip } from "#src/trips/types.ts";
import { locateItem } from "./build-outline.ts";
import { addItemOps, moveItemOps } from "./move-item-ops.ts";

function applied(trip: Trip, ops: readonly DraftOp[]): Trip {
  const result = applyOps(trip, withExpect(trip, ops));
  if (result.status !== "applied") throw new Error(JSON.stringify(result));
  return result.trip;
}

const empty = newTrip({
  title: "Test trip",
  firstDate: "2027-04-16",
  days: 2,
  timeZone: "Europe/Lisbon",
  language: "en",
});
const [dayOne, dayTwo] = empty.days;
const newMomentId = () => "new-moment";

/** Day one: a cafe at 09:00 with no words, a walk at 15:00 with two places, and "Dinner" at 19:00 with one restaurant. */
const start = applied(empty, [
  { op: "addMoment", dayId: dayOne.id, moment: { id: "bare", time: "09:00" } },
  {
    op: "addItem",
    to: { momentId: "bare" },
    item: { id: "cafe", type: "dining", name: "Cafe" },
  },
  {
    op: "addMoment",
    dayId: dayOne.id,
    moment: { id: "dinner", time: "19:00", text: "Dinner" },
  },
  {
    op: "addItem",
    to: { momentId: "dinner" },
    item: { id: "tasca", type: "dining", name: "Tasca" },
  },
  {
    op: "addMoment",
    dayId: dayOne.id,
    moment: { id: "walk", time: "15:00", text: "Walk" },
  },
  {
    op: "addItem",
    to: { momentId: "walk" },
    item: { id: "castle", type: "place", name: "Castle" },
  },
  {
    op: "addItem",
    to: { momentId: "walk" },
    item: { id: "viewpoint", type: "place", name: "Viewpoint" },
  },
]);

const momentsOf = (trip: Trip, dayIndex: number) =>
  trip.days[dayIndex].moments.map((moment) => moment.id);

const whereIs = (trip: Trip, id: string) => {
  const found = locateItem(trip, id);
  return (
    found && {
      dayId: found.dayId,
      time: found.moment?.time ?? null,
      text: found.moment?.text,
    }
  );
};

describe("moveItemOps", () => {
  it("moves the moment of an item that is alone in it, so the words of the moment stay", () => {
    const trip = applied(
      start,
      moveItemOps(
        start,
        "tasca",
        { dayId: dayTwo.id, time: "20:00" },
        newMomentId,
      ),
    );
    expect(whereIs(trip, "tasca")).toEqual({
      dayId: dayTwo.id,
      time: "20:00",
      text: "Dinner",
    });
    expect(momentsOf(trip, 0)).toEqual(["bare", "walk"]);
  });

  it("takes only the item out of a moment that holds more, into a new moment at the time", () => {
    const trip = applied(
      start,
      moveItemOps(
        start,
        "castle",
        { dayId: dayOne.id, time: "10:00" },
        newMomentId,
      ),
    );
    expect(whereIs(trip, "castle")).toEqual({
      dayId: dayOne.id,
      time: "10:00",
      text: undefined,
    });
    expect(whereIs(trip, "viewpoint")?.text).toBe("Walk");
  });

  it("puts the item in the moment that the day already has at the time, and keeps the words that it leaves", () => {
    const trip = applied(
      start,
      moveItemOps(
        start,
        "tasca",
        { dayId: dayOne.id, time: "15:00" },
        newMomentId,
      ),
    );
    expect(whereIs(trip, "tasca")?.text).toBe("Walk");
    expect(momentsOf(trip, 0)).toEqual(["bare", "dinner", "walk"]);
  });

  it("puts an item with no time in the list of the day for its kind, and a moment with no words that it leaves empty goes", () => {
    const trip = applied(
      start,
      moveItemOps(start, "cafe", { dayId: dayTwo.id, time: null }, newMomentId),
    );
    expect(trip.days[1].dining.map((entry) => entry.id)).toEqual(["cafe"]);
    expect(momentsOf(trip, 0)).toEqual(["dinner", "walk"]);
  });
});

describe("addItemOps", () => {
  it("adds an item at a time, in the moment of that time or in a new one", () => {
    const item = { id: "bar", type: "dining", name: "Bar" } as const;
    const joined = applied(
      start,
      addItemOps(start, item, { dayId: dayOne.id, time: "19:00" }, newMomentId),
    );
    expect(whereIs(joined, "bar")?.text).toBe("Dinner");

    const alone = applied(
      start,
      addItemOps(
        start,
        item,
        { dayId: dayTwo.id, time: "morning" },
        newMomentId,
      ),
    );
    expect(whereIs(alone, "bar")).toEqual({
      dayId: dayTwo.id,
      time: "morning",
      text: undefined,
    });
  });
});
