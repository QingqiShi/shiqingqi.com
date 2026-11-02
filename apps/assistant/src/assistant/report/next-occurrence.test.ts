import { describe, expect, it } from "vitest";
import {
  firstOccurrence,
  nextOccurrence,
  nextOccurrenceDates,
  sameRepeatRule,
  type RepeatRule,
  nextOccurrenceReminder,
} from "./next-occurrence.ts";

function walk(rule: RepeatRule, from: string, count: number) {
  const dates = [];
  let dueDate = from;
  for (let step = 0; step < count; step += 1) {
    dueDate = nextOccurrence(rule, { dueDate, doneOn: dueDate });
    dates.push(dueDate);
  }
  return dates;
}

describe("nextOccurrence", () => {
  it("steps days by the interval", () => {
    expect(walk({ kind: "daily", every: 3 }, "2026-02-27", 2)).toEqual([
      "2026-03-02",
      "2026-03-05",
    ]);
  });

  it("visits the chosen weekdays, and skips the weeks between", () => {
    const rule: RepeatRule = { kind: "weekly", every: 2, weekdays: [1, 3] };
    // 2026-11-02 is a Monday.
    expect(walk(rule, "2026-11-02", 4)).toEqual([
      "2026-11-04",
      "2026-11-16",
      "2026-11-18",
      "2026-11-30",
    ]);
  });

  it("counts a Sunday as the end of its week", () => {
    const rule: RepeatRule = { kind: "weekly", every: 2, weekdays: [1, 7] };
    // 2026-11-08 is a Sunday.
    expect(walk(rule, "2026-11-08", 2)).toEqual(["2026-11-16", "2026-11-22"]);
  });

  it("clamps the 31st to a short month and returns to the 31st after it", () => {
    const rule: RepeatRule = { kind: "monthly", every: 1, day: 31 };
    expect(walk(rule, "2027-01-31", 4)).toEqual([
      "2027-02-28",
      "2027-03-31",
      "2027-04-30",
      "2027-05-31",
    ]);
  });

  it("takes the last day of each month, and leap years count", () => {
    const rule: RepeatRule = { kind: "monthly", every: 1, day: "last" };
    expect(walk(rule, "2028-01-31", 2)).toEqual(["2028-02-29", "2028-03-31"]);
  });

  it("skips months by the interval, across a year", () => {
    const rule: RepeatRule = { kind: "monthly", every: 3, day: 15 };
    expect(walk(rule, "2026-11-15", 2)).toEqual(["2027-02-15", "2027-05-15"]);
  });

  it("takes the rule's day that is still to come in a date's own month", () => {
    const rule: RepeatRule = { kind: "monthly", every: 3, day: 15 };
    expect(walk(rule, "2026-11-10", 1)).toEqual(["2026-11-15"]);
  });

  it("clamps 29 February in other years and returns to it in a leap year", () => {
    const rule: RepeatRule = { kind: "yearly", every: 1, month: 2, day: 29 };
    expect(walk(rule, "2027-02-28", 2)).toEqual(["2028-02-29", "2029-02-28"]);
  });

  it("skips years by the interval", () => {
    const rule: RepeatRule = { kind: "yearly", every: 2, month: 3, day: 5 };
    expect(walk(rule, "2026-03-05", 1)).toEqual(["2028-03-05"]);
  });

  it("goes past the day it was done when it was done late, in step with the interval", () => {
    const rule: RepeatRule = { kind: "weekly", every: 2, weekdays: [1] };
    expect(
      nextOccurrence(rule, { dueDate: "2026-11-02", doneOn: "2026-11-20" }),
    ).toBe("2026-11-30");
  });

  it("keeps the next occurrence after its own date when done early", () => {
    const rule: RepeatRule = { kind: "monthly", every: 1, day: 15 };
    expect(
      nextOccurrence(rule, { dueDate: "2026-11-15", doneOn: "2026-11-02" }),
    ).toBe("2026-12-15");
  });

  it("counts from the day it is done for a to-do with no date", () => {
    const rule: RepeatRule = { kind: "monthly", every: 1, day: 15 };
    expect(nextOccurrence(rule, { dueDate: null, doneOn: "2026-11-20" })).toBe(
      "2026-12-15",
    );
  });

  it("counts from the day it is done for a rule of days after, whatever the date", () => {
    expect(
      nextOccurrence(
        { kind: "after-done", days: 10 },
        { dueDate: "2026-11-30", doneOn: "2026-11-02" },
      ),
    ).toBe("2026-11-12");
  });
});

describe("nextOccurrenceDates", () => {
  it("keeps the start date as far before the due date", () => {
    expect(
      nextOccurrenceDates(
        { kind: "monthly", every: 1, day: 10 },
        { dueDate: "2026-11-10", startDate: "2026-11-08" },
        "2026-11-09",
      ),
    ).toEqual({ dueDate: "2026-12-10", startDate: "2026-12-08" });
  });

  it("has no start date without a due date to measure from", () => {
    expect(
      nextOccurrenceDates(
        { kind: "after-done", days: 7 },
        { dueDate: null, startDate: "2026-11-01" },
        "2026-11-02",
      ),
    ).toEqual({ dueDate: "2026-11-09", startDate: null });
  });
});

describe("firstOccurrence", () => {
  it("can be today, whatever the interval", () => {
    expect(firstOccurrence({ kind: "daily", every: 5 }, "2026-11-02")).toBe(
      "2026-11-02",
    );
    expect(
      firstOccurrence(
        { kind: "weekly", every: 2, weekdays: [1] },
        "2026-11-02",
      ),
    ).toBe("2026-11-02");
  });

  it("finds the rule's next day", () => {
    expect(
      firstOccurrence({ kind: "monthly", every: 2, day: 1 }, "2026-11-02"),
    ).toBe("2026-12-01");
  });

  it("gives no date to a rule that counts from the day it is done", () => {
    expect(
      firstOccurrence({ kind: "after-done", days: 7 }, "2026-11-02"),
    ).toBeNull();
  });
});

describe("nextOccurrenceReminder", () => {
  it("keeps the time on the owner's clock when the clocks change", () => {
    expect(
      nextOccurrenceReminder(new Date("2026-10-24T14:00:00Z"), {
        dueDate: "2026-10-24",
        nextDueDate: "2026-10-31",
        timeZone: "Europe/London",
      }).toISOString(),
    ).toBe("2026-10-31T15:00:00.000Z");
  });

  it("stays as many days before the due date, by the owner's dates", () => {
    expect(
      nextOccurrenceReminder(new Date("2026-11-27T22:00:00Z"), {
        dueDate: "2026-11-30",
        nextDueDate: "2026-12-31",
        timeZone: "Asia/Shanghai",
      }).toISOString(),
    ).toBe("2026-12-28T22:00:00.000Z");
  });

  it("falls on the next due date when there was no due date to count from", () => {
    expect(
      nextOccurrenceReminder(new Date("2026-11-02T09:30:00Z"), {
        dueDate: null,
        nextDueDate: "2026-11-09",
        timeZone: "UTC",
      }).toISOString(),
    ).toBe("2026-11-09T09:30:00.000Z");
  });
});

describe("sameRepeatRule", () => {
  it("does not depend on the order of the keys, which a jsonb column changes", () => {
    expect(
      sameRepeatRule(
        { kind: "monthly", every: 1, day: 3 },
        { day: 3, every: 1, kind: "monthly" },
      ),
    ).toBe(true);
    expect(sameRepeatRule({ kind: "daily", every: 1 }, null)).toBe(false);
  });
});
