import { describe, expect, it } from "vitest";
import { applyOps } from "#src/trips/ops/apply-ops.ts";
import sample from "#src/trips/sample-trip.json";
import { entityId, tripSchema } from "#src/trips/trip-schema.ts";
import type { Trip } from "#src/trips/types.ts";
import { bindPlaceholders, type RawBatch } from "./bind-placeholders.ts";
import { proveBatches, type Proof } from "./prove-batches.ts";

const trip = tripSchema.parse(sample);

function prove(batches: { ops: Record<string, unknown>[] }[]): Proof {
  const raw: RawBatch[] = batches.map((batch) => ({
    summary: "A change",
    ...batch,
  }));
  const bound = bindPlaceholders(raw);
  return bound.ok ? proveBatches(trip, bound.batches) : bound;
}

function reasonOf(batches: { ops: Record<string, unknown>[] }[]) {
  const proof = prove(batches);
  return proof.ok ? null : proof.reason;
}

function applyAll(from: Trip, proof: Proof) {
  if (!proof.ok) throw new Error(proof.reason);
  let state = from;
  for (const { sent } of proof.batches) {
    const result = applyOps(state, sent);
    if (result.status !== "applied") throw new Error(result.status);
    state = result.trip;
  }
  return state;
}

describe("placeholders", () => {
  it("gives one new id to one placeholder through all the batches", () => {
    const proof = prove([
      {
        ops: [
          {
            op: "addMoment",
            dayId: "day3sample",
            before: "m3foz",
            moment: { id: "$lunch", time: "13:00", text: "Lunch" },
          },
        ],
      },
      {
        ops: [
          {
            op: "addItem",
            to: { momentId: "$lunch" },
            item: { id: "$cafe", type: "dining", name: "Café Majestic" },
          },
        ],
      },
    ]);
    if (!proof.ok) throw new Error(proof.reason);
    const [first, second] = proof.batches;
    const [add] = first.ops;
    if (add.op !== "addMoment") throw new Error(add.op);
    const momentId = add.moment.id;
    expect(entityId.safeParse(momentId).success).toBe(true);
    expect(second.ops[0]).toMatchObject({ to: { momentId } });
    const after = applyAll(trip, proof);
    const day = after.days.find((each) => each.id === "day3sample");
    expect(day?.moments.map((moment) => moment.text)).toContain("Lunch");
  });

  it("refuses a placeholder that names nothing yet, one that names two things, and a new thing with an id of its own", () => {
    const add = (id: string) => ({
      op: "addMoment",
      dayId: "day3sample",
      moment: { id, time: "13:00", text: "Lunch" },
    });
    const usedFirst = reasonOf([
      {
        ops: [
          {
            op: "addItem",
            to: { momentId: "$lunch" },
            item: { id: "$x", type: "tip", kind: "info", text: "Hi" },
          },
          add("$lunch"),
        ],
      },
    ]);
    expect(usedFirst).toContain("names nothing");
    expect(reasonOf([{ ops: [add("$a"), add("$a")] }])).toContain(
      "two new things",
    );
    expect(reasonOf([{ ops: [add("lunch")] }])).toContain("placeholder");
  });
});

describe("the proof of the batches", () => {
  it("names the batch and the op that does not apply", () => {
    expect(
      reasonOf([
        {
          ops: [
            { op: "setMoment", id: "m2evening", fields: { time: "20:00" } },
          ],
        },
        { ops: [{ op: "removeMoment", id: "nosuchmoment" }] },
      ]),
    ).toMatch(/^Batch 2, op 1 \(removeMoment\)/);
    expect(reasonOf([{ ops: [] }])).toBe("Batch 1 has no ops.");
    // `applyOps` puts a moment last when its `before` is on another day.
    expect(
      reasonOf([
        {
          ops: [
            {
              op: "addMoment",
              dayId: "day2sample",
              before: "m3foz",
              moment: { id: "$lunch", time: "13:00", text: "Lunch" },
            },
          ],
        },
      ]),
    ).toContain("not in the same day");
  });

  it("names both days of a move between days, and of a swap of two days", () => {
    const proof = prove([
      {
        ops: [
          {
            op: "moveItem",
            id: "i0castle",
            to: { dayId: "day3sample", list: "places" },
          },
        ],
      },
      { ops: [{ op: "moveDay", id: "day3sample", before: "day2sample" }] },
    ]);
    if (!proof.ok) throw new Error(proof.reason);
    expect(proof.batches.map((batch) => batch.dayIds)).toEqual([
      ["day0sample", "day3sample"],
      ["day3sample", "day2sample"],
    ]);
  });
});
