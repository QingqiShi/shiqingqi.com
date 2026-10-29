import { describe, expect, it } from "vitest";
import { addDays } from "../domain/dates/add-days.ts";
import {
  isBusinessDay,
  toBusinessDay,
} from "../domain/dates/to-business-day.ts";
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
    nonBusinessDay: "stay",
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

describe("nextOccurrence off weekends and bank holidays", () => {
  const monthly = (dayOfMonth: number, nonBusinessDay: "next" | "previous") =>
    schedule({ startsOn: "2026-01-01", dayOfMonth, nonBusinessDay });

  it("moves past Christmas and its substitute day", () => {
    const councilTax = monthly(25, "next");
    expect(nextOccurrence(councilTax, "2026-12-01")).toBe("2026-12-29");
    expect(nextOccurrence(councilTax, "2026-12-26")).toBe("2026-12-29");
    expect(nextOccurrence(councilTax, "2026-12-29")).toBe("2026-12-29");
    expect(nextOccurrence(councilTax, "2026-12-30")).toBe("2027-01-25");
  });

  it("keeps every occurrence on or after the start", () => {
    expect(
      nextOccurrence(
        schedule({
          startsOn: "2026-10-25",
          dayOfMonth: 25,
          nonBusinessDay: "previous",
        }),
        "2026-10-01",
      ),
    ).toBe("2026-11-25");
    expect(
      nextOccurrence(
        schedule({
          startsOn: "2026-10-25",
          dayOfMonth: 24,
          nonBusinessDay: "next",
        }),
        "2026-10-25",
      ),
    ).toBe("2026-10-26");
  });

  it("gives one business day for each scheduled day, in order, over ten years", () => {
    const from = "2019-01-15";
    const to = "2028-12-15";
    for (const nonBusinessDay of ["next", "previous"] as const) {
      for (const [unit, days] of [
        ["month", [1, 15, 25, 28, 29, 30, 31]],
        ["week", [1, 3, 5, 6, 7]],
        ["year", [1, 25, 31]],
      ] as const) {
        for (const day of days) {
          const stay = schedule({
            unit,
            startsOn: "2018-06-01",
            dayOfMonth: unit === "week" ? null : day,
            weekday: unit === "week" ? day : null,
            monthOfYear: unit === "year" ? 12 : null,
          });
          const expected = occurrencesBetween(
            stay,
            addDays(from, -14),
            addDays(to, 14),
          )
            .map((scheduled) => toBusinessDay(scheduled, nonBusinessDay))
            .filter((moved) => moved >= from && moved <= to);
          const moved = occurrencesBetween(
            { ...stay, nonBusinessDay },
            from,
            to,
          );
          const label = `${unit} ${String(day)} ${nonBusinessDay}`;
          expect(moved, label).toEqual(expected);
          expect(new Set(moved).size, label).toBe(moved.length);
          expect(moved.every(isBusinessDay), label).toBe(true);
        }
      }
    }
  });
});
