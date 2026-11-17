import { expect, it } from "vitest";
import {
  applyOps,
  withExpect,
  type DraftOp,
} from "#src/trips/ops/apply-ops.ts";
import sample from "#src/trips/sample-trip.json";
import { tripSchema } from "#src/trips/trip-schema.ts";
import { summarizeChange } from "./summarize-change.ts";

const trip = tripSchema.parse(sample);

function after(ops: DraftOp[]) {
  const result = applyOps(trip, withExpect(trip, ops));
  if (result.status !== "applied") throw new Error(JSON.stringify(result));
  return result.trip;
}

it("finds nothing between two equal trips", () => {
  expect(summarizeChange(trip, structuredClone(trip))).toEqual({
    trip: false,
    days: [],
  });
});

it("counts the moments and items that changed, came and went on each day", () => {
  const newer = after([
    { op: "setMoment", id: "m2out", fields: { time: "09:30" } },
    { op: "setMoment", id: "m2train", fields: { text: "Second class" } },
    {
      op: "addItem",
      to: { dayId: "day3sample", list: "places" },
      item: { type: "place", id: "p3lello", name: "Livraria Lello" },
    },
    { op: "removeMoment", id: "m3foz" },
  ]);
  expect(summarizeChange(trip, newer)).toEqual({
    trip: false,
    days: [
      { number: 3, status: "changed", added: 0, changed: 2, removed: 0 },
      { number: 4, status: "changed", added: 1, changed: 0, removed: 1 },
    ],
  });
});

it("counts one move as one change, not a change of each neighbour", () => {
  const newer = after([
    {
      op: "moveMoment",
      id: "m0checkin",
      dayId: "day0sample",
      before: "m0flight",
    },
  ]);
  expect(summarizeChange(trip, newer).days).toEqual([
    { number: 1, status: "changed", added: 0, changed: 1, removed: 0 },
  ]);
});

it("names a new first date as a change of the trip, not of each day", () => {
  const newer = after([
    { op: "setFirstDate", date: "2027-05-01" },
    { op: "setTrip", fields: { title: "Lisbon and Porto in May" } },
  ]);
  expect(summarizeChange(trip, newer)).toEqual({ trip: true, days: [] });
});

it("names a day that is new or gone as a whole", () => {
  const newer = after([
    { op: "addDay", id: "day5sample" },
    { op: "removeDay", id: "day1sample" },
  ]);
  expect(summarizeChange(trip, newer).days).toEqual([
    { number: 5, status: "added", added: 0, changed: 0, removed: 0 },
    { number: 2, status: "removed", added: 0, changed: 0, removed: 0 },
  ]);
});
