import { describe, expect, it } from "vitest";
import { addDays, daysBetween } from "./add-days.ts";
import { addMonths } from "./add-months.ts";
import { endOfMonth, startOfMonth, startOfYear } from "./start-of-month.ts";
import { endOfWeek, startOfWeek, weekdayOf } from "./start-of-week.ts";
import {
  daysInMonth,
  fromEpochDay,
  isValidDay,
  parseDay,
  toEpochDay,
} from "./to-epoch-day.ts";
import { todayInTimeZone } from "./today-in-time-zone.ts";

describe("toEpochDay and fromEpochDay", () => {
  it.each([
    ["1970-01-01", 0],
    ["1969-12-31", -1],
    ["2000-01-01", 10957],
    ["2000-02-29", 11016],
    ["2026-10-09", 20735],
  ])("puts %s at epoch day %i", (day, epochDay) => {
    expect(toEpochDay(day)).toBe(epochDay);
    expect(fromEpochDay(epochDay)).toBe(day);
  });

  it("agrees with Date.UTC on every day from 1900 to 2100", () => {
    const msPerDay = 86_400_000;
    const disagreements: number[] = [];
    for (
      let epochDay = Date.UTC(1900, 0, 1) / msPerDay;
      epochDay <= Date.UTC(2100, 11, 31) / msPerDay;
      epochDay++
    ) {
      const day = new Date(epochDay * msPerDay).toISOString().slice(0, 10);
      if (fromEpochDay(epochDay) !== day || toEpochDay(day) !== epochDay) {
        disagreements.push(epochDay);
      }
    }
    expect(disagreements).toEqual([]);
  });

  it.each([
    "2026-02-29",
    "2026-13-01",
    "2026-00-10",
    "2026-04-31",
    "2026-1-1",
    "2026/01/01",
    "abcd-01-01",
    "2026-01-01T00:00",
    "",
  ])("refuses %j", (day) => {
    expect(isValidDay(day)).toBe(false);
    expect(() => toEpochDay(day)).toThrow(RangeError);
  });

  it("reads the parts of a day", () => {
    expect(parseDay("2024-02-29")).toEqual({
      year: 2024,
      month: 2,
      dayOfMonth: 29,
    });
    expect(daysInMonth(2100, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29);
  });
});

describe("addDays and daysBetween", () => {
  it("crosses month, year and leap-day boundaries", () => {
    expect(addDays("2026-10-09", 1)).toBe("2026-10-10");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2024-03-01", -1)).toBe("2024-02-29");
    expect(addDays("2026-10-09", -90)).toBe("2026-07-11");
  });

  it("counts the days from one day to another", () => {
    expect(daysBetween("2026-10-01", "2026-10-09")).toBe(8);
    expect(daysBetween("2026-10-09", "2026-10-01")).toBe(-8);
    expect(daysBetween("2024-01-01", "2025-01-01")).toBe(366);
  });
});

describe("addMonths", () => {
  it("keeps the day of the month when it exists", () => {
    expect(addMonths("2026-10-09", 1)).toBe("2026-11-09");
    expect(addMonths("2026-10-09", -10)).toBe("2025-12-09");
    expect(addMonths("2026-10-09", 24)).toBe("2028-10-09");
  });

  it("moves to the last day of a shorter month", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonths("2026-03-31", -1)).toBe("2026-02-28");
    expect(addMonths("2026-05-31", 1)).toBe("2026-06-30");
  });
});

describe("week boundaries", () => {
  it("knows the weekday", () => {
    expect(weekdayOf("2026-10-09")).toBe(5);
    expect(weekdayOf("2026-10-11")).toBe(7);
    expect(weekdayOf("2026-10-12")).toBe(1);
    expect(weekdayOf("1969-12-29")).toBe(1);
  });

  it("starts weeks on Monday and ends them on Sunday", () => {
    expect(startOfWeek("2026-10-09")).toBe("2026-10-05");
    expect(endOfWeek("2026-10-09")).toBe("2026-10-11");
    expect(startOfWeek("2026-10-05")).toBe("2026-10-05");
    expect(endOfWeek("2026-10-11")).toBe("2026-10-11");
    expect(startOfWeek("2027-01-01")).toBe("2026-12-28");
  });

  it("starts weeks on another weekday when asked", () => {
    expect(startOfWeek("2026-10-09", 7)).toBe("2026-10-04");
    expect(endOfWeek("2026-10-09", 7)).toBe("2026-10-10");
  });
});

describe("month and year boundaries", () => {
  it("gives the first and last day of the month and year", () => {
    expect(startOfMonth("2026-10-09")).toBe("2026-10-01");
    expect(endOfMonth("2026-10-09")).toBe("2026-10-31");
    expect(endOfMonth("2024-02-10")).toBe("2024-02-29");
    expect(endOfMonth("2026-02-10")).toBe("2026-02-28");
    expect(endOfMonth("2026-09-10")).toBe("2026-09-30");
    expect(startOfYear("2026-10-09")).toBe("2026-01-01");
  });
});

describe("todayInTimeZone", () => {
  const lateEvening = new Date("2026-10-09T23:30:00Z");

  it("gives the household's calendar day, not the machine's", () => {
    expect(todayInTimeZone("UTC", lateEvening)).toBe("2026-10-09");
    expect(todayInTimeZone("Europe/London", lateEvening)).toBe("2026-10-10");
    expect(todayInTimeZone("Asia/Shanghai", lateEvening)).toBe("2026-10-10");
    expect(todayInTimeZone("America/New_York", lateEvening)).toBe("2026-10-09");
  });

  it("follows the household's summer time", () => {
    expect(
      todayInTimeZone("Europe/London", new Date("2026-01-15T23:30:00Z")),
    ).toBe("2026-01-15");
    expect(
      todayInTimeZone("Europe/London", new Date("2026-07-15T23:30:00Z")),
    ).toBe("2026-07-16");
  });
});
