import { describe, expect, it } from "vitest";
import type { RuleSchedule } from "./next-occurrence.ts";
import { rescheduleExpected } from "./reschedule-expected.ts";

const before: RuleSchedule = {
  unit: "month",
  interval: 1,
  dayOfMonth: 1,
  weekday: null,
  monthOfYear: null,
  nonBusinessDay: "next",
  startsOn: "2026-10-01",
  endsOn: null,
};
const after: RuleSchedule = { ...before, nonBusinessDay: "stay" };
const deletedAt = "2026-10-20T12:00:00Z";

describe("rescheduleExpected", () => {
  it("restores no Expected Transaction on a day that has a live one", () => {
    const rows = [
      {
        id: "b",
        date: "2026-11-01",
        status: "posted" as const,
        deletedAt: null,
      },
      { id: "a", date: "2026-11-01", status: "expected" as const, deletedAt },
    ];

    expect(rescheduleExpected(before, after, rows)).toEqual({
      remove: [],
      restore: [],
    });
  });
});
