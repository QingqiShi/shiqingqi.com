import { describe, expect, it } from "vitest";
import {
  nextOccurrence,
  occurrencesBetween,
  type RuleSchedule,
} from "./next-occurrence.ts";

function schedule(fields: Partial<RuleSchedule>): RuleSchedule {
  return {
    unit: "month",
    interval: 1,
    dayOfMonth: null,
    weekday: null,
    monthOfYear: null,
    startsOn: "2026-01-31",
    endsOn: null,
    ...fields,
  };
}

describe("nextOccurrence", () => {
  it("moves a monthly day past the month's end back to its last day", () => {
    expect(
      occurrencesBetween(schedule({}), "2026-01-01", "2026-05-31"),
    ).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
      "2026-05-31",
    ]);
    expect(
      nextOccurrence(
        schedule({ startsOn: "2028-01-01", dayOfMonth: 30 }),
        "2028-02-01",
      ),
    ).toBe("2028-02-29");
  });

  it("counts the interval from the start month", () => {
    const quarterly = schedule({ startsOn: "2026-02-15", interval: 3 });
    expect(occurrencesBetween(quarterly, "2026-03-01", "2027-01-01")).toEqual([
      "2026-05-15",
      "2026-08-15",
      "2026-11-15",
    ]);
  });

  it("repeats on a weekday every n weeks", () => {
    const fortnightly = schedule({
      unit: "week",
      interval: 2,
      weekday: 5,
      startsOn: "2026-10-01",
    });
    expect(occurrencesBetween(fortnightly, "2026-10-01", "2026-11-01")).toEqual(
      ["2026-10-02", "2026-10-16", "2026-10-30"],
    );
    expect(nextOccurrence(fortnightly, "2026-10-03")).toBe("2026-10-16");
  });

  it("repeats yearly on a month and day, clamped in short years", () => {
    const leapDay = schedule({
      unit: "year",
      startsOn: "2024-02-29",
    });
    expect(occurrencesBetween(leapDay, "2024-01-01", "2028-12-31")).toEqual([
      "2024-02-29",
      "2025-02-28",
      "2026-02-28",
      "2027-02-28",
      "2028-02-29",
    ]);
    const renewal = schedule({
      unit: "year",
      startsOn: "2026-10-10",
      monthOfYear: 3,
      dayOfMonth: 1,
    });
    expect(nextOccurrence(renewal, "2026-10-10")).toBe("2027-03-01");
  });

  it("stops at endsOn and never starts before startsOn", () => {
    const rent = schedule({
      startsOn: "2026-03-01",
      dayOfMonth: 1,
      endsOn: "2026-05-01",
    });
    expect(occurrencesBetween(rent, "2025-01-01", "2026-12-31")).toEqual([
      "2026-03-01",
      "2026-04-01",
      "2026-05-01",
    ]);
  });
});
