import { describe, expect, test } from "vitest";
import { fromEpochDay } from "../domain/dates/to-epoch-day.ts";
import { todayInTimeZone } from "../domain/dates/today-in-time-zone.ts";
import { periodBoundaries } from "./period-boundaries.ts";
import {
  defaultGrouping,
  resolveAnalyticsRange,
} from "./resolve-analytics-range.ts";

function startsOf(boundaries: Int32Array) {
  return Array.from(boundaries.subarray(0, -1), fromEpochDay);
}

describe("periodBoundaries", () => {
  test("starts weeks on Monday and cuts the first and last week to the range", () => {
    const boundaries = periodBoundaries("2026-09-02", "2026-09-22", "week");
    expect(startsOf(boundaries)).toEqual([
      "2026-09-02",
      "2026-09-07",
      "2026-09-14",
      "2026-09-21",
    ]);
    expect(fromEpochDay(boundaries[boundaries.length - 1])).toBe("2026-09-23");
  });

  test("splits months and years on the calendar", () => {
    expect(
      startsOf(periodBoundaries("2025-11-15", "2026-02-03", "month")),
    ).toEqual(["2025-11-15", "2025-12-01", "2026-01-01", "2026-02-01"]);
    expect(
      startsOf(periodBoundaries("2024-06-01", "2026-01-01", "year")),
    ).toEqual(["2024-06-01", "2025-01-01", "2026-01-01"]);
    expect(
      startsOf(periodBoundaries("2026-02-27", "2026-03-01", "day")),
    ).toEqual(["2026-02-27", "2026-02-28", "2026-03-01"]);
  });

  test("buckets by the Household's day, not the device's", () => {
    // 23:30 UTC on Sunday 4 Oct is already Monday 5 Oct in Shanghai.
    const now = new Date("2026-10-04T23:30:00Z");
    const london = todayInTimeZone("Europe/London", now);
    const shanghai = todayInTimeZone("Asia/Shanghai", now);
    expect(london).toBe("2026-10-05");
    expect(shanghai).toBe("2026-10-05");
    const lateUtc = new Date("2026-10-04T22:30:00Z");
    expect(todayInTimeZone("Europe/London", lateUtc)).toBe("2026-10-04");
    const thisWeek = (today: string) =>
      startsOf(
        periodBoundaries(
          resolveAnalyticsRange("3M", today, { firstDay: null }).from,
          today,
          "week",
        ),
      ).at(-1);
    expect(thisWeek(todayInTimeZone("Europe/London", lateUtc))).toBe(
      "2026-09-28",
    );
    expect(thisWeek(todayInTimeZone("Asia/Shanghai", lateUtc))).toBe(
      "2026-10-05",
    );
  });
});

describe("resolveAnalyticsRange", () => {
  const today = "2026-10-10";

  test("compares with the same stretch one length earlier", () => {
    expect(
      resolveAnalyticsRange("thisMonth", today, { firstDay: null }),
    ).toEqual({
      from: "2026-10-01",
      to: today,
      previous: { from: "2026-09-01", to: "2026-09-10" },
    });
    expect(
      resolveAnalyticsRange("lastMonth", today, { firstDay: null }),
    ).toEqual({
      from: "2026-09-01",
      to: "2026-09-30",
      previous: { from: "2026-08-01", to: "2026-08-31" },
    });
    expect(resolveAnalyticsRange("12M", today, { firstDay: null })).toEqual({
      from: "2025-11-01",
      to: today,
      previous: { from: "2024-11-01", to: "2025-10-10" },
    });
    expect(
      resolveAnalyticsRange("YTD", today, { firstDay: null }).previous,
    ).toEqual({
      from: "2025-01-01",
      to: "2025-10-10",
    });
    expect(
      resolveAnalyticsRange("custom", today, {
        firstDay: null,
        custom: { from: "2026-09-10", to: "2026-09-01" },
      }),
    ).toEqual({
      from: "2026-09-01",
      to: "2026-09-10",
      previous: { from: "2026-08-22", to: "2026-08-31" },
    });
    expect(
      resolveAnalyticsRange("all", today, { firstDay: "2019-03-04" }),
    ).toEqual({ from: "2019-03-04", to: today, previous: null });
  });

  test("picks a bar length that suits the range", () => {
    expect(defaultGrouping("2026-10-01", today)).toBe("day");
    expect(defaultGrouping("2026-08-01", today)).toBe("week");
    expect(defaultGrouping("2025-11-01", today)).toBe("month");
    expect(defaultGrouping("2015-01-01", today)).toBe("year");
  });
});
