import { describe, expect, it } from "vitest";
import { dateLabel, dateRangeLabel, weekdayLabel } from "./date-label";

const range = (from: string, to: string) => [{ date: from }, { date: to }];

describe("dateRangeLabel", () => {
  it("writes the month once within a month, and twice across months", () => {
    expect(dateRangeLabel(range("2026-06-11", "2026-06-15"), "zh")).toBe(
      "2026 年 6 月 11 – 15 日",
    );
    expect(dateRangeLabel(range("2026-06-28", "2026-07-02"), "zh")).toBe(
      "2026 年 6 月 28 日 – 7 月 2 日",
    );
    expect(dateRangeLabel(range("2026-06-11", "2026-06-15"), "en")).toBe(
      "11–15 June 2026",
    );
    expect(dateRangeLabel(range("2026-06-28", "2026-07-02"), "en")).toBe(
      "28 June – 2 July 2026",
    );
  });

  it("writes the year twice across years", () => {
    expect(dateRangeLabel(range("2026-12-30", "2027-01-02"), "zh")).toBe(
      "2026 年 12 月 30 日 – 2027 年 1 月 2 日",
    );
    expect(dateRangeLabel(range("2026-12-30", "2027-01-02"), "en")).toBe(
      "30 December 2026 – 2 January 2027",
    );
  });
});

describe("dateLabel and weekdayLabel", () => {
  it("keep a calendar date on its day in every time zone", () => {
    expect(dateLabel("2026-06-18", "zh")).toBe("6月18日");
    expect(weekdayLabel("2026-06-18", "zh")).toBe("周四");
    expect(dateLabel("2026-06-18", "en")).toBe("18 June");
    expect(weekdayLabel("2026-06-18", "en")).toBe("Thu");
  });
});
