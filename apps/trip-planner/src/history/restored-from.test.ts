import { expect, it } from "vitest";
import { applyOps, withExpect } from "#src/trips/ops/apply-ops.ts";
import sample from "#src/trips/sample-trip.json";
import { tripSchema } from "#src/trips/trip-schema.ts";
import type { Trip } from "#src/trips/types.ts";
import { restoredFrom } from "./restored-from.ts";
import type { TripVersion } from "./trip-history.ts";

const first = tripSchema.parse(sample);
const second = edited(first, "09:30");
const third = edited(first, "10:00");

function edited(trip: Trip, time: string) {
  const result = applyOps(
    trip,
    withExpect(trip, [{ op: "setMoment", id: "m2out", fields: { time } }]),
  );
  if (result.status !== "applied") throw new Error(JSON.stringify(result));
  return result.trip;
}

/** Versions newest first, from trips oldest first. */
function history(...trips: Trip[]): TripVersion[] {
  return trips
    .map((trip, index) => ({
      revision: index + 1,
      savedAt: new Date(Date.UTC(2026, 10, 17, index)),
      stamp: "",
      author: "you" as const,
      trip: structuredClone(trip),
    }))
    .reverse();
}

const revisionsOf = (restores: Map<number, TripVersion>) =>
  Object.fromEntries(
    [...restores].map(([revision, from]) => [revision, from.revision]),
  );

it("finds a version that puts an older one back", () => {
  expect(
    revisionsOf(restoredFrom(history(first, second, third, second))),
  ).toEqual({ 4: 2 });
});

it("names the newest of the equal older versions", () => {
  expect(
    revisionsOf(restoredFrom(history(first, second, first, third, first))),
  ).toEqual({ 3: 1, 5: 3 });
});

it("takes a version the same as the one right before it as no restore", () => {
  expect(revisionsOf(restoredFrom(history(first, second, second)))).toEqual({});
});
