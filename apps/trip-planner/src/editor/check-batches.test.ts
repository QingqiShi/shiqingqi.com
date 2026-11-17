import { describe, expect, it } from "vitest";
import type { ProposedBatch } from "#src/ai/ai-api.ts";
import { checkProposal } from "#src/ai/check-proposal.ts";
import {
  applyOps,
  withExpect,
  type DraftOp,
} from "#src/trips/ops/apply-ops.ts";
import { newTrip } from "#src/trips/ops/new-trip.ts";
import type { Trip } from "#src/trips/types.ts";
import { checkBatches, type Decision } from "./check-batches.ts";

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
const start = applied(empty, [
  {
    op: "addItem",
    to: { dayId: dayOne.id, list: "places" },
    item: { id: "castle", type: "place", name: "Castle" },
  },
]);

/** The batches as the editor gets them: the answer of the server for the model's ops on `start`. */
function proposed(...batches: object[][]): ProposedBatch[] {
  const checked = checkProposal(
    start,
    JSON.stringify({
      message: "Done.",
      batches: batches.map((ops) => ({ summary: "A change", ops })),
    }),
  );
  if (!checked.ok) throw new Error(checked.reason);
  return JSON.parse(JSON.stringify(checked.value.batches)) as ProposedBatch[];
}

const statesOf = (
  trip: Trip,
  batches: ProposedBatch[],
  decisions: [number, Decision][] = [],
) =>
  checkBatches(trip, batches, new Map(decisions)).map((check) =>
    check === null
      ? null
      : "needs" in check
        ? `${check.state} ${check.needs.join()}`
        : check.state,
  );

const addNoon = {
  op: "addMoment",
  dayId: dayOne.id,
  moment: { id: "$noon", time: "12:00" },
};

/** A new moment, then a place in it, then a new name for the castle. */
const batches = proposed(
  [addNoon],
  [
    {
      op: "addItem",
      to: { momentId: "$noon" },
      item: { id: "$market", type: "place", name: "Market" },
    },
  ],
  [{ op: "setItem", id: "castle", fields: { name: "Old castle" } }],
);

describe("checkBatches", () => {
  it("names the batch that a later batch waits for, and takes each batch that stands alone", () => {
    expect(statesOf(start, batches)).toEqual(["ready", "waits 0", "ready"]);
  });

  it("takes a batch after the batch that it builds on is in the trip", () => {
    const withMoment = applied(start, batches[0].ops);
    expect(statesOf(withMoment, batches, [[0, "accepted"]])).toEqual([
      null,
      "ready",
      "ready",
    ]);
  });

  it("refuses a batch that builds on a batch that the person skipped, and names it", () => {
    expect(statesOf(start, batches, [[0, "skipped"]])).toEqual([
      null,
      "stale 0",
      "ready",
    ]);
  });

  it("refuses a batch for a thing that changed after the model read it", () => {
    const removeEmptyDay = proposed([{ op: "removeDay", id: dayTwo.id }]);
    expect(statesOf(start, removeEmptyDay)).toEqual(["ready"]);

    const withPlace = applied(start, [
      {
        op: "addItem",
        to: { dayId: dayTwo.id, list: "places" },
        item: { id: "museum", type: "place", name: "Museum" },
      },
    ]);
    expect(statesOf(withPlace, removeEmptyDay)).toEqual(["stale "]);

    const withNote = applied(start, [
      { op: "setItem", id: "castle", fields: { note: "Closed on Mondays" } },
    ]);
    expect(statesOf(withNote, batches)).toEqual(["ready", "waits 0", "stale "]);
  });

  it("makes a batch wait for the batch that adds the thing that it goes before", () => {
    const beforeNoon = proposed(
      [addNoon],
      [
        {
          op: "addMoment",
          dayId: dayOne.id,
          before: "$noon",
          moment: { id: "$coffee", time: "10:00" },
        },
      ],
    );
    expect(statesOf(start, beforeNoon)).toEqual(["ready", "waits 0"]);
    expect(statesOf(start, beforeNoon, [[0, "skipped"]])).toEqual([
      null,
      "stale 0",
    ]);
  });

  it("gives the trip with the batch, as the preview shows it", () => {
    const [, market] = checkBatches(start, batches, new Map());
    expect(market?.state).toBe("waits");
    if (market?.state !== "waits") return;
    const names = (trip: Trip) =>
      trip.days[0].moments.flatMap((moment) =>
        moment.items.map((item) => ("name" in item ? item.name : "")),
      );
    expect(names(market.before)).toEqual([]);
    expect(names(market.after)).toEqual(["Market"]);
  });
});
