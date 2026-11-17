import { describe, expect, it } from "vitest";
import { applyOps, withExpect } from "#src/trips/ops/apply-ops.ts";
import { newTrip } from "#src/trips/ops/new-trip.ts";
import sample from "#src/trips/sample-trip.json";
import { entityId, tripSchema } from "#src/trips/trip-schema.ts";
import type { Trip } from "#src/trips/types.ts";
import { bindDraftDays } from "./ai-api.ts";
import { checkDraft, checkProposal } from "./check-proposal.ts";

const trip = tripSchema.parse(sample);

function answer(batches: { summary?: string; ops: unknown[] }[]) {
  return JSON.stringify({
    message: "Done.",
    batches: batches.map((batch) => ({ summary: "A change", ...batch })),
  });
}

function reasonOf(text: string) {
  const checked = checkProposal(trip, text);
  return checked.ok ? null : checked.reason;
}

function applyAll(
  from: Trip,
  batches: { ops: Parameters<typeof withExpect>[1] }[],
) {
  let state = from;
  for (const { ops } of batches) {
    const result = applyOps(state, withExpect(state, ops));
    if (result.status !== "applied") throw new Error(result.status);
    state = result.trip;
  }
  return state;
}

describe("placeholders", () => {
  it("gives one new id to one placeholder through all the batches", () => {
    const checked = checkProposal(
      trip,
      answer([
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
      ]),
    );
    if (!checked.ok) throw new Error(checked.reason);
    const [first, second] = checked.value.batches;
    const [add] = first.ops;
    if (add.op !== "addMoment") throw new Error(add.op);
    const momentId = add.moment.id;
    expect(entityId.safeParse(momentId).success).toBe(true);
    expect(second.ops[0]).toMatchObject({ to: { momentId } });
    const after = applyAll(trip, checked.value.batches);
    const day = after.days.find((each) => each.id === "day3sample");
    expect(day?.moments.map((moment) => moment.text)).toContain("Lunch");
  });

  it("refuses a placeholder that names nothing yet, one that names two things, and a new thing with an id of its own", () => {
    const add = (id: string) => ({
      op: "addMoment",
      dayId: "day3sample",
      moment: { id, time: "13:00", text: "Lunch" },
    });
    const usedFirst = reasonOf(
      answer([
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
      ]),
    );
    expect(usedFirst).toContain("names nothing");
    expect(reasonOf(answer([{ ops: [add("$a"), add("$a")] }]))).toContain(
      "two new things",
    );
    expect(reasonOf(answer([{ ops: [add("lunch")] }]))).toContain(
      "placeholder",
    );
  });
});

describe("the proof of the batches", () => {
  it("names the batch and the op that does not apply", () => {
    expect(
      reasonOf(
        answer([
          {
            ops: [
              { op: "setMoment", id: "m2evening", fields: { time: "20:00" } },
            ],
          },
          { ops: [{ op: "removeMoment", id: "nosuchmoment" }] },
        ]),
      ),
    ).toMatch(/^Batch 2, op 1 \(removeMoment\)/);
    expect(reasonOf(answer([{ ops: [] }]))).toBe("Batch 1 has no ops.");
    // `applyOps` puts a moment last when its `before` is on another day.
    expect(
      reasonOf(
        answer([
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
      ),
    ).toContain("not in the same day");
  });

  it("names both days of a move between days, and of a swap of two days", () => {
    const checked = checkProposal(
      trip,
      answer([
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
      ]),
    );
    if (!checked.ok) throw new Error(checked.reason);
    expect(checked.value.batches.map((batch) => batch.dayIds)).toEqual([
      ["day0sample", "day3sample"],
      ["day3sample", "day2sample"],
    ]);
  });

  it("gives no batches for an answer that changes nothing", () => {
    expect(
      checkProposal(
        trip,
        '```json\n{"message":"Dinner is at 20:00.","batches":[]}\n```',
      ),
    ).toEqual({
      ok: true,
      value: { message: "Dinner is at 20:00.", batches: [] },
    });
  });
});

describe("a draft", () => {
  it("applies to the trip that its fields make, once its days are bound", () => {
    const fields = {
      title: "Two days in Rome",
      firstDate: "2027-03-01",
      days: 2,
      timeZone: "Europe/Rome",
      language: "en",
    } as const;
    const checked = checkDraft(
      JSON.stringify({
        fields,
        message: "Made.",
        batches: [
          {
            summary: "Day 2",
            ops: [
              {
                op: "addMoment",
                dayId: "$day2",
                moment: { id: "$colosseum", time: "10:00", text: "Colosseum" },
              },
              { op: "setDay", id: "$day2", fields: { title: "Ancient Rome" } },
            ],
          },
        ],
      }),
    );
    if (!checked.ok) throw new Error(checked.reason);
    const made = newTrip(fields);
    const after = applyAll(made, bindDraftDays(checked.value, made));
    expect(after.days[1]).toMatchObject({
      id: made.days[1].id,
      title: "Ancient Rome",
      moments: [{ time: "10:00", text: "Colosseum" }],
    });
  });
});
