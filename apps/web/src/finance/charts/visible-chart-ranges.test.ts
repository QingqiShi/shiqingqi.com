import { describe, expect, it } from "vitest";
import { visibleChartRanges } from "./visible-chart-ranges.ts";

describe("visibleChartRanges", () => {
  it("offers every range when there is room", () => {
    expect(visibleChartRanges("6M", false)).toHaveLength(7);
  });

  it("offers five on a phone, plus the picked range", () => {
    expect(visibleChartRanges("6M", true)).toEqual([
      "1M",
      "6M",
      "YTD",
      "1Y",
      "all",
    ]);
    expect(visibleChartRanges("5Y", true)).toEqual([
      "1M",
      "6M",
      "YTD",
      "1Y",
      "5Y",
      "all",
    ]);
  });
});
