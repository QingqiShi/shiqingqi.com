import { describe, expect, it } from "vitest";
import { netWorthComparisonDays } from "./net-worth-comparison-days.ts";

describe("netWorthComparisonDays", () => {
  it("compares with a week ago and the end of last year", () => {
    expect(netWorthComparisonDays("2026-10-10")).toEqual({
      lastWeek: "2026-10-03",
      yearStart: "2025-12-31",
    });
    expect(netWorthComparisonDays("2026-01-03")).toEqual({
      lastWeek: "2025-12-27",
      yearStart: "2025-12-31",
    });
  });
});
