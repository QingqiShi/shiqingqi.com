import { describe, expect, it } from "vitest";
import { dateLabel, dateRangeLabel, weekdayLabel } from "./date-label";

const june = [{ date: "2026-06-11" }, { date: "2026-06-15" }];
const acrossMonths = [{ date: "2026-06-28" }, { date: "2026-07-02" }];

describe("dateRangeLabel", () => {
  it("writes the month once within a month, and twice across months", () => {
    expect(dateRangeLabel(june, "zh")).toBe("2026年6月11–15日");
    expect(dateRangeLabel(acrossMonths, "zh")).toBe("2026年6月28日–7月2日");
    expect(dateRangeLabel(june, "en")).toBe("11\u2009–\u200915 June 2026");
    expect(dateRangeLabel(acrossMonths, "en")).toBe(
      "28 June\u2009–\u20092 July 2026",
    );
  });
});

describe("dateLabel and weekdayLabel", () => {
  it("write the day in each language", () => {
    expect(dateLabel("2026-06-18", "zh")).toBe("6月18日");
    expect(weekdayLabel("2026-06-18", "zh")).toBe("周四");
    expect(dateLabel("2026-06-18", "en")).toBe("18 June");
    expect(weekdayLabel("2026-06-18", "en")).toBe("Thu");
  });
});
