import { describe, expect, it } from "vitest";
import {
  applyDrops,
  buildDayFeed,
  formatDuration,
  optionalMoments,
} from "./schedule";
import type { Day } from "@/data/types";

/** A minimal day with the required scaffolding; pass the fields a test cares
 *  about. Keeps each case focused on the scheduling behaviour under test. */
function makeDay(partial: Partial<Day>): Day {
  return {
    n: 1,
    date: "2026-06-24",
    dateLabel: "6月24日",
    weekday: "周三",
    title: "Test day",
    route: "A → B",
    timeline: [],
    places: [],
    restaurants: [],
    stay: { summary: "Stay", lodging: [] },
    ...partial,
  };
}

/** A clean drive chain: depart → optional A → optional B → booked lunch →
 *  arrive, with each optional stop owning its inbound drive so drops re-stitch. */
function chainDay(): Day {
  return makeDay({
    anchors: [{ time: "13:00", label: "Arrive", kind: "checkin" }],
    timeline: [
      { time: "09:00", text: "Depart" },
      { time: "10:00", text: "Stop A", optional: true, durationMin: 30 },
      { time: "11:00", text: "Stop B", optional: true, durationMin: 45 },
      { time: "12:00", text: "Lunch" },
      { time: "13:00", text: "Arrive" },
    ],
    nav: [
      {
        label: "Home→A",
        from: "Home",
        to: "A",
        time: "10:00",
        optional: true,
        durationMin: 20,
      },
      {
        label: "A→B",
        from: "A",
        to: "B",
        time: "11:00",
        optional: true,
        durationMin: 25,
      },
      { label: "B→Lunch", from: "B", to: "Lunch", time: "12:00" },
    ],
    places: [
      { name: "A", query: "A", time: "10:00", optional: true },
      { name: "B", query: "B", time: "11:00", optional: true },
    ],
    restaurants: [
      {
        name: "Table",
        query: "Table",
        time: "12:00",
        status: "booked",
        tag: "set",
        description: "booked table",
      },
    ],
  });
}

const at = (moments: ReturnType<typeof buildDayFeed>, time: string) =>
  moments.find((moment) => moment.time === time);

describe("buildDayFeed classification", () => {
  it("marks a fully-optional stop optional and sums its dwell", () => {
    const moments = buildDayFeed(chainDay());
    const a = at(moments, "10:00");
    expect(a?.optional).toBe(true);
    expect(a?.hard).toBe(false);
    // max over the stop's pieces: dwell 30 beats the 20min inbound drive.
    expect(a?.durationMin).toBe(30);
  });

  it("treats a booked table as a hard, non-optional moment", () => {
    const moments = buildDayFeed(chainDay());
    const lunch = at(moments, "12:00");
    expect(lunch?.hard).toBe(true);
    expect(lunch?.optional).toBe(false);
  });

  it("keeps a moment with any backbone piece non-optional", () => {
    // Depart carries a plain (non-optional) timeline step.
    const moments = buildDayFeed(chainDay());
    expect(at(moments, "09:00")?.optional).toBe(false);
  });

  it("treats a checkout anchor's time as a hard deadline", () => {
    const day = makeDay({
      anchors: [{ time: "10:00", label: "Check out", kind: "checkout" }],
      timeline: [
        { time: "10:00", text: "Leave", optional: true, durationMin: 15 },
      ],
    });
    const moment = at(buildDayFeed(day), "10:00");
    expect(moment?.hard).toBe(true);
    expect(moment?.optional).toBe(false);
  });

  it("defaults an optional stop with no stated duration to 30 minutes", () => {
    const day = makeDay({
      timeline: [{ time: "10:00", text: "Wander", optional: true }],
      places: [{ name: "Wander", query: "W", time: "10:00", optional: true }],
    });
    expect(at(buildDayFeed(day), "10:00")?.durationMin).toBe(30);
  });

  it("does not flag a flight moment optional", () => {
    const day = makeDay({
      timeline: [{ time: "08:00", text: "Land", optional: true }],
      flights: [
        {
          number: "CX255",
          from: { code: "HKG", city: "HK" },
          to: { code: "LHR", city: "London" },
          time: "08:00",
        },
      ],
    });
    const moment = at(buildDayFeed(day), "08:00");
    expect(moment?.hard).toBe(true);
    expect(moment?.optional).toBe(false);
  });
});

describe("optionalMoments", () => {
  it("returns optional stops in time order", () => {
    const optionals = optionalMoments(buildDayFeed(chainDay()));
    expect(optionals.map((moment) => moment.time)).toEqual(["10:00", "11:00"]);
  });

  it("keeps only stops still ahead of the given clock", () => {
    const optionals = optionalMoments(buildDayFeed(chainDay()), 10 * 60 + 30);
    expect(optionals.map((moment) => moment.time)).toEqual(["11:00"]);
  });
});

describe("applyDrops", () => {
  it("returns the full feed and zero saved when nothing is dropped", () => {
    const moments = buildDayFeed(chainDay());
    const plan = applyDrops(moments, new Set());
    expect(plan.rows).toHaveLength(moments.length);
    expect(plan.savedMinutes).toBe(0);
    expect(plan.droppedLabels).toEqual([]);
  });

  it("removes a dropped stop and re-routes the next drive from its origin", () => {
    const moments = buildDayFeed(chainDay());
    const plan = applyDrops(moments, new Set(["10:00"]));

    expect(plan.rows.map((row) => row.moment.time)).toEqual([
      "09:00",
      "11:00",
      "12:00",
      "13:00",
    ]);
    expect(plan.savedMinutes).toBe(30);
    expect(plan.droppedLabels).toEqual(["A"]);

    const stopB = plan.rows.find((row) => row.moment.time === "11:00");
    const drive = stopB?.moment.nav[0];
    expect(drive?.from).toBe("Home"); // re-stitched past the skipped stop
    expect(drive?.skipped).toEqual(["A"]);
    expect(stopB?.skippedBefore).toEqual(["A"]);
  });

  it("carries the original origin across consecutive drops", () => {
    const moments = buildDayFeed(chainDay());
    const plan = applyDrops(moments, new Set(["10:00", "11:00"]));

    expect(plan.rows.map((row) => row.moment.time)).toEqual([
      "09:00",
      "12:00",
      "13:00",
    ]);
    expect(plan.savedMinutes).toBe(75);

    const lunch = plan.rows.find((row) => row.moment.time === "12:00");
    expect(lunch?.moment.nav[0]?.from).toBe("Home");
    expect(lunch?.moment.nav[0]?.skipped).toEqual(["A", "B"]);
  });

  it("never drops a backbone moment, even if its time is in the set", () => {
    const moments = buildDayFeed(chainDay());
    const plan = applyDrops(moments, new Set(["12:00"]));
    expect(plan.rows.map((row) => row.moment.time)).toContain("12:00");
    expect(plan.savedMinutes).toBe(0);
  });

  it("does not mutate the input moments", () => {
    const moments = buildDayFeed(chainDay());
    const before = at(moments, "11:00")?.nav[0]?.from;
    applyDrops(moments, new Set(["10:00"]));
    expect(at(moments, "11:00")?.nav[0]?.from).toBe(before);
  });
});

describe("formatDuration", () => {
  it.each([
    [30, "30 分钟"],
    [60, "1 小时"],
    [75, "1 小时 15 分钟"],
    [90, "1 小时 30 分钟"],
  ])("formats %i minutes as %s", (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected);
  });
});
