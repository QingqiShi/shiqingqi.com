import { describe, expect, it } from "vitest";
import { resolveDay } from "./resolve-day";
import sample from "@/trips/testing/sample-trip.json";
import { tripSchema } from "@/trips/trip-schema";

const { days } = tripSchema.parse(sample);

describe("resolveDay", () => {
  it("counts the day on the trip's clock, not in UTC", () => {
    // 23:30 UTC on 16 April is already 17 April in Lisbon (UTC+1).
    const now = new Date("2027-04-16T23:30:00Z");
    expect(resolveDay(now, days, "Europe/Lisbon")).toEqual({
      index: 1,
      phase: "during",
      daysUntil: 0,
    });
    expect(resolveDay(now, days, "America/New_York").index).toBe(0);
  });

  it("counts the days until the start, and lands on the last day after", () => {
    expect(
      resolveDay(new Date("2027-04-10T12:00:00Z"), days, "Europe/Lisbon"),
    ).toEqual({ index: 0, phase: "before", daysUntil: 6 });
    expect(
      resolveDay(new Date("2027-05-01T12:00:00Z"), days, "Europe/Lisbon"),
    ).toEqual({ index: 4, phase: "after", daysUntil: 0 });
  });
});
