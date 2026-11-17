import { describe, expect, it } from "vitest";
import sample from "../sample-trip.json";
import { tripSchema } from "../trip-schema.ts";
import type { Trip } from "../types.ts";
import { applyOps, withExpect, type DraftOp } from "./apply-ops.ts";
import { invertOps } from "./invert-ops.ts";

const lisbon = tripSchema.parse(sample);

function applied(trip: Trip, drafts: readonly DraftOp[]): Trip {
  const result = applyOps(trip, withExpect(trip, drafts));
  if (result.status !== "applied") {
    throw new Error(`Not applied: ${JSON.stringify(result)}`);
  }
  return result.trip;
}

/** Applies the batch, then its undo, and gives the trip that the undo makes. */
function roundTrip(before: Trip, drafts: readonly DraftOp[]): Trip {
  const after = applied(before, drafts);
  expect(after).not.toEqual(before);
  return applied(after, invertOps(before, drafts));
}

const cases: [string, DraftOp[]][] = [
  [
    "trip details",
    [{ op: "setTrip", fields: { title: "Porto first", subtitle: null } }],
  ],
  ["the first date", [{ op: "setFirstDate", date: "2027-05-01" }]],
  ["an added day", [{ op: "addDay", id: "daynew", before: "day2sample" }]],
  [
    "a removed day with what it held, who was there and the stay that repeated it",
    [{ op: "removeDay", id: "day0sample" }],
  ],
  [
    "a day moved after the night that a stay repeats",
    [{ op: "moveDay", id: "day0sample" }],
  ],
  [
    "a day moved back",
    [{ op: "moveDay", id: "day3sample", before: "day1sample" }],
  ],
  [
    "a day's details",
    [
      {
        op: "setDay",
        id: "day1sample",
        fields: { title: "Sintra", route: null },
      },
    ],
  ],
  [
    "a stay's details",
    [
      {
        op: "setStay",
        dayId: "day3sample",
        fields: { note: "Late check-in", sameAs: null },
      },
    ],
  ],
  [
    "who is there on a day",
    [
      {
        op: "setPresence",
        personId: "rita",
        dayId: "day1sample",
        presence: null,
      },
      {
        op: "setPresence",
        personId: "ben",
        dayId: "day1sample",
        presence: "home",
      },
    ],
  ],
  [
    "an added moment",
    [
      {
        op: "addMoment",
        dayId: "day1sample",
        moment: { id: "m1lunch", time: "13:00", text: "Lunch" },
        before: "m1backup",
      },
    ],
  ],
  [
    "a moment's time and text",
    [
      {
        op: "setMoment",
        id: "m0afternoon",
        fields: { time: "evening", text: null },
      },
    ],
  ],
  [
    "a moment that the batch left empty",
    [{ op: "setMoment", id: "m0checkin", fields: { highlight: null } }],
  ],
  [
    "a moment moved to another day",
    [{ op: "moveMoment", id: "m0dinner", dayId: "day4sample" }],
  ],
  [
    "a removed moment with its items",
    [{ op: "removeMoment", id: "m0afternoon" }],
  ],
  [
    "an added item",
    [
      {
        op: "addItem",
        to: { dayId: "day1sample", list: "dining" },
        item: { id: "r1tascantiga", type: "dining", name: "Tascantiga" },
      },
    ],
  ],
  [
    "a new name that the map query followed",
    [{ op: "setItem", id: "i0view", fields: { name: "Santa Luzia" } }],
  ],
  [
    "an item moved out of a moment",
    [
      {
        op: "moveItem",
        id: "i0castle",
        to: { dayId: "day0sample", list: "places" },
        before: "p0lx",
      },
    ],
  ],
  ["a removed lodging", [{ op: "removeItem", id: "l2douro" }]],
];

describe("an undo gives back the trip as it was", () => {
  it.each(cases)("for %s", (_, drafts) => {
    expect(roundTrip(lisbon, drafts)).toEqual(lisbon);
  });

  it("for a meal moved to a new time, out of a moment that then went", () => {
    const drafts: DraftOp[] = [
      { op: "setMoment", id: "m0metro", fields: { text: null } },
      {
        op: "addMoment",
        dayId: "day0sample",
        moment: { id: "m0ride", time: "12:00" },
      },
      { op: "moveItem", id: "i0metro", to: { momentId: "m0ride" } },
    ];
    const after = applied(lisbon, drafts);
    expect(after.days[0].moments.map((m) => m.id)).not.toContain("m0metro");
    expect(applied(after, invertOps(lisbon, drafts))).toEqual(lisbon);
  });

  it("for a batch that changes days and what they hold together", () => {
    expect(
      roundTrip(lisbon, [
        { op: "setItem", id: "i0castle", fields: { note: "Go early" } },
        { op: "addDay", id: "daynew" },
        { op: "moveMoment", id: "m1backup", dayId: "daynew" },
        { op: "removeDay", id: "day2sample" },
        { op: "moveDay", id: "day4sample", before: "day0sample" },
        { op: "setFirstDate", date: "2027-06-01" },
        { op: "removeMoment", id: "m0dinner" },
        { op: "removeItem", id: "t0cash" },
      ]),
    ).toEqual(lisbon);
  });

  it("for a batch that fills a new day, then takes it out", () => {
    expect(
      roundTrip(lisbon, [
        { op: "addDay", id: "daynew", before: "day1sample" },
        {
          op: "moveItem",
          id: "r0pasteis",
          to: { dayId: "daynew", list: "dining" },
        },
        { op: "removeDay", id: "daynew" },
      ]),
    ).toEqual(lisbon);
  });

  it("for a stay that repeats a night again after it had its own copy of that night", () => {
    expect(
      roundTrip(lisbon, [
        { op: "moveDay", id: "day0sample" },
        { op: "moveDay", id: "day0sample", before: "day1sample" },
        {
          op: "setStay",
          dayId: "day1sample",
          fields: { sameAs: { dayId: "day0sample", label: "Same again" } },
        },
      ]),
    ).toEqual(lisbon);
  });

  it("for a removed day after a gap in the dates", () => {
    const gap = applied(lisbon, [
      { op: "addDay", id: "daylater", date: "2027-04-30" },
    ]);
    expect(roundTrip(gap, [{ op: "removeDay", id: "daylater" }])).toEqual(gap);
  });

  it("for a moment that was empty before the batch", () => {
    const empty = applied(lisbon, [
      {
        op: "addMoment",
        dayId: "day4sample",
        moment: { id: "m4free", time: "afternoon" },
      },
    ]);
    expect(empty.days[4].moments.map((m) => m.id)).toContain("m4free");
    expect(
      roundTrip(empty, [
        {
          op: "addItem",
          to: { momentId: "m4free" },
          item: { id: "i4tip", type: "tip", kind: "info", text: "Pack" },
        },
      ]),
    ).toEqual(empty);
  });

  it("is empty for a batch that does not apply", () => {
    expect(invertOps(lisbon, [{ op: "removeItem", id: "nothing" }])).toEqual(
      [],
    );
  });
});
