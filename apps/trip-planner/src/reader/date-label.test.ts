import { describe, expect, it } from "vitest";
import { dateRangeLabel } from "./date-label";

describe("dateRangeLabel", () => {
  it("writes the month once within a month, and twice across months", () => {
    expect(
      dateRangeLabel([{ date: "2026-06-11" }, { date: "2026-06-15" }]),
    ).toBe("2026 年 6 月 11 – 15 日");
    expect(
      dateRangeLabel([{ date: "2026-06-28" }, { date: "2026-07-02" }]),
    ).toBe("2026 年 6 月 28 日 – 7 月 2 日");
  });
});
