import { describe, expect, it } from "vitest";
import { newTrip } from "#src/trips/ops/new-trip.ts";
import {
  answerStatus,
  takeBack,
  type Decided,
  type Returned,
} from "./answer-status.ts";
import type { BatchCheck } from "./check-batches.ts";

const trip = newTrip({
  title: "Test trip",
  firstDate: "2027-04-16",
  days: 1,
  timeZone: "Europe/Lisbon",
  language: "en",
});
const ready: BatchCheck = { state: "ready", before: trip, after: trip };

const accepted = (batchId: number): Decided => ({
  decision: "accepted",
  batchId,
});

describe("answerStatus", () => {
  it("keeps a way back to an answer with a skipped change, until the person dismisses it", () => {
    const decided = new Map<number, Decided>([
      [0, accepted(7)],
      [1, { decision: "skipped" }],
    ]);
    const checks = [null, null];
    expect(answerStatus(checks, decided, new Map(), false)).toMatchObject({
      kind: "settled",
      accepted: 1,
      skipped: 1,
    });
    expect(answerStatus(checks, decided, new Map(), true)).toBeNull();
  });

  it("says nothing when each change of the answer is in the trip", () => {
    expect(
      answerStatus([null], new Map([[0, accepted(7)]]), new Map(), false),
    ).toBeNull();
  });
});

describe("takeBack", () => {
  it("does not make a change that the person took back wait again", () => {
    const { decided, returned } = takeBack(
      new Map([[0, accepted(7)]]),
      new Map(),
      new Set([7]),
      () => true,
    );
    expect(returned.get(0)).toBe("takenBack");
    // The trip can take the change again, so its check is ready.
    expect(answerStatus([ready], decided, returned, false)).toMatchObject({
      kind: "settled",
      takenBack: 1,
    });
  });

  it("marks a change that the queue dropped as not saved", () => {
    const { returned } = takeBack(
      new Map([[0, accepted(7)]]),
      new Map<number, Returned>(),
      new Set([7]),
      () => false,
    );
    expect(returned.get(0)).toBe("notSaved");
  });
});
