import { describe, expect, it } from "vitest";
import { checkDraft } from "#src/ai/check-proposal.ts";
import { applyOps } from "#src/trips/ops/apply-ops.ts";
import { newTrip, type NewTrip } from "#src/trips/ops/new-trip.ts";
import type { Trip } from "#src/trips/types.ts";
import { fillNewTrip, type FillApi } from "./fill-new-trip.ts";

const fields: NewTrip = {
  title: "Kyoto",
  firstDate: "2027-04-03",
  days: 3,
  timeZone: "Asia/Tokyo",
  language: "en",
};

const checked = checkDraft(
  JSON.stringify({
    fields,
    message: "Made.",
    batches: [
      {
        summary: "Day 1",
        ops: [{ op: "setDay", id: "$day1", fields: { title: "Gion" } }],
      },
      {
        summary: "Day 2",
        ops: [
          {
            op: "addMoment",
            dayId: "$day2",
            moment: { id: "$inari", time: "07:00", text: "Fushimi Inari" },
          },
        ],
      },
      {
        summary: "Earlier start",
        ops: [{ op: "setMoment", id: "$inari", fields: { time: "06:30" } }],
      },
    ],
  }),
);
if (!checked.ok) throw new Error(checked.reason);
const draft = checked.value;

/** A server that holds one trip and applies each change as the real one does. */
function server(failAt?: number) {
  let trip: Trip = newTrip(fields);
  let changes = 0;
  const api: FillApi = {
    read: () => Promise.resolve(structuredClone(trip)),
    change(_tripId, ops) {
      changes++;
      if (changes === failAt) return Promise.reject(new Error("offline"));
      const result = applyOps(trip, ops);
      if (result.status !== "applied") return Promise.resolve(result);
      trip = result.trip;
      return Promise.resolve({ ...result, revision: changes + 1 });
    },
  };
  return { api, trip: () => trip };
}

describe("fillNewTrip", () => {
  it("saves every batch, each on the trip that the save before it gave back", async () => {
    const { api, trip } = server();
    expect(await fillNewTrip(draft, "trip", api)).toEqual({
      saved: 3,
      total: 3,
    });
    expect(trip().days[0].title).toBe("Gion");
    expect(trip().days[1].moments).toMatchObject([
      { time: "06:30", text: "Fushimi Inari" },
    ]);
  });

  it("stops at the first batch that does not save, and says how far it got", async () => {
    const { api, trip } = server(2);
    expect(await fillNewTrip(draft, "trip", api)).toEqual({
      saved: 1,
      total: 3,
    });
    expect(trip().days[0].title).toBe("Gion");
    expect(trip().days[1].moments).toEqual([]);
  });

  it("saves nothing when the made trip cannot be read", async () => {
    const { api } = server();
    expect(
      await fillNewTrip(draft, "trip", {
        ...api,
        read: () => Promise.resolve(null),
      }),
    ).toEqual({ saved: 0, total: 3 });
  });
});
