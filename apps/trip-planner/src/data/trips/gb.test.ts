import { describe, expect, it } from "vitest";
import type { AnchorKind } from "../types";
import { gb } from "./gb";
import { buildDayFeed } from "@/lib/schedule";

// These guard the hand-authored `optional` / `durationMin` tags against the two
// authoring mistakes that matter: marking a must-do droppable, or leaving an
// intended optional stop un-droppable because one of its pieces wasn't flagged.

const HARD_ANCHOR_KINDS = new Set<AnchorKind>([
  "flight",
  "pickup",
  "dropoff",
  "reservation",
  "transit",
  "checkout",
]);

describe("GB trip optional authoring", () => {
  it("never marks a must-do moment optional", () => {
    for (const day of gb.days) {
      const hardTimes = new Set(
        (day.anchors ?? [])
          .filter((a) => a.time && HARD_ANCHOR_KINDS.has(a.kind))
          .map((a) => a.time),
      );
      for (const moment of buildDayFeed(day)) {
        if (!moment.optional) continue;
        const where = `D${String(day.n)} ${moment.time}`;
        expect(moment.hard, where).toBe(false);
        expect(
          moment.dining.some((r) => r.status === "booked"),
          where,
        ).toBe(false);
        expect(moment.flights.length, where).toBe(0);
        expect(hardTimes.has(moment.time), where).toBe(false);
        expect(moment.durationMin, where).toBeGreaterThan(0);
      }
    }
  });

  it("offers droppable stops on every remaining touring day", () => {
    const optionalCount = (dayN: number) => {
      const day = gb.days.find((d) => d.n === dayN);
      if (!day) throw new Error(`no day ${String(dayN)}`);
      return buildDayFeed(day).filter((m) => m.optional).length;
    };
    // Days 6–11 are the trip's touring days; the final travel-home day is not.
    for (const dayN of [6, 7, 8, 9, 10, 11])
      expect(optionalCount(dayN), `D${String(dayN)}`).toBeGreaterThan(0);
    expect(optionalCount(12)).toBe(0);
  });

  it("keeps the booked Henrock dinner a protected, non-optional moment", () => {
    const day6 = gb.days.find((d) => d.n === 6);
    if (!day6) throw new Error("no day 6");
    const dinner = buildDayFeed(day6).find((m) =>
      m.dining.some((r) => r.name.includes("Henrock")),
    );
    expect(dinner?.hard).toBe(true);
    expect(dinner?.optional).toBe(false);
  });
});
