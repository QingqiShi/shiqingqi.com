import { describe, expect, it } from "vitest";
import { displayDay } from "./display-day.ts";
import { displayMoment, displayTime } from "./display-moment.ts";
import { toEpochDay } from "./to-epoch-day.ts";

describe("displayDay", () => {
  it.each([
    ["weekday", "Thu 15 Oct", "10月15日 周四"],
    ["weekdayYear", "Thu 15 Oct 2026", "2026年10月15日 周四"],
    ["weekdayLong", "Thursday 15 October", "10月15日 星期四"],
    ["day", "15 Oct", "10月15日"],
    ["dayYear", "15 Oct 2026", "2026年10月15日"],
    ["monthYear", "Oct 2026", "2026年10月"],
  ] as const)("writes the %s style in English and Chinese", (style, en, zh) => {
    expect(displayDay("2026-10-15", "en", style)).toBe(en);
    expect(displayDay("2026-10-15", "zh", style)).toBe(zh);
  });

  it("takes an epoch day as well as a YYYY-MM-DD day", () => {
    expect(displayDay(toEpochDay("2026-01-02"), "en", "dayYear")).toBe(
      "2 Jan 2026",
    );
  });
});

describe("displayMoment", () => {
  it("uses a 24-hour clock and shows the year only when it is not this year", () => {
    const now = new Date(2026, 9, 10, 12);
    expect(displayMoment(new Date(2026, 9, 10, 4, 15), "en", now)).toBe(
      "10 Oct, 04:15",
    );
    expect(displayMoment(new Date(2026, 9, 10, 16, 5), "zh", now)).toBe(
      "10月10日 16:05",
    );
    expect(displayMoment(new Date(2025, 11, 31, 23, 59), "en", now)).toBe(
      "31 Dec 2025, 23:59",
    );
    expect(displayTime(new Date(2026, 9, 10, 4, 1), "en")).toBe("04:01");
  });
});
