import { expect, test } from "vitest";
import { partialPeriods } from "./partial-periods.ts";
import { periodBoundaries } from "./period-boundaries.ts";

function partialOf(
  from: string,
  to: string,
  grouping: "day" | "week" | "month" | "year",
) {
  return Array.from(
    partialPeriods(periodBoundaries(from, to, grouping), grouping),
  );
}

test("marks the month a range stops inside of", () => {
  expect(partialOf("2025-11-01", "2026-10-10", "month")).toEqual([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
  ]);
  expect(partialOf("2025-11-01", "2026-10-31", "month").includes(1)).toBe(
    false,
  );
});

test("marks a first week that starts after Monday and a last one cut short", () => {
  // 2026-08-01 is a Saturday; 2026-10-10 is a Saturday.
  const weeks = partialOf("2026-08-01", "2026-10-10", "week");
  expect(weeks[0]).toBe(1);
  expect(weeks.at(-1)).toBe(1);
  expect(weeks.slice(1, -1).every((flag) => flag === 0)).toBe(true);
});

test("marks a year to date, and never a day", () => {
  expect(partialOf("2026-01-01", "2026-10-10", "year")).toEqual([1]);
  expect(partialOf("2026-10-01", "2026-10-10", "day").includes(1)).toBe(false);
});
