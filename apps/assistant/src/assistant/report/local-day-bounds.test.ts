import { describe, expect, it } from "vitest";
import {
  addDays,
  isInBounds,
  localDayBounds,
  reportMailWindow,
} from "./local-day-bounds.ts";

describe("localDayBounds", () => {
  it("runs from local midnight to the next local midnight, in winter and in summer time", () => {
    expect(localDayBounds("2026-12-01", "Europe/London")).toEqual({
      start: new Date("2026-12-01T00:00:00Z"),
      end: new Date("2026-12-02T00:00:00Z"),
    });
    expect(localDayBounds("2026-07-01", "Europe/London")).toEqual({
      start: new Date("2026-06-30T23:00:00Z"),
      end: new Date("2026-07-01T23:00:00Z"),
    });
    expect(localDayBounds("2026-11-01", "Asia/Shanghai")).toEqual({
      start: new Date("2026-10-31T16:00:00Z"),
      end: new Date("2026-11-01T16:00:00Z"),
    });
  });

  it("is 25 hours long on the day the clocks go back", () => {
    const day = localDayBounds("2026-10-25", "Europe/London");
    expect(day).toEqual({
      start: new Date("2026-10-24T23:00:00Z"),
      end: new Date("2026-10-26T00:00:00Z"),
    });
  });

  it("holds an instant from its start up to, but not at, its end", () => {
    const day = localDayBounds("2026-11-01", "America/Los_Angeles");
    expect(isInBounds(new Date("2026-11-01T07:00:00Z"), day)).toBe(true);
    expect(isInBounds(new Date("2026-11-02T07:59:59Z"), day)).toBe(true);
    expect(isInBounds(new Date("2026-11-02T08:00:00Z"), day)).toBe(false);
    expect(isInBounds(new Date("2026-11-01T06:59:59Z"), day)).toBe(false);
  });
});

describe("reportMailWindow", () => {
  it("runs from the report hour yesterday to the report hour today on the local clock", () => {
    expect(reportMailWindow("2026-11-01", 8, "Asia/Shanghai")).toEqual({
      start: new Date("2026-10-31T00:00:00Z"),
      end: new Date("2026-11-01T00:00:00Z"),
    });
  });

  it("is 25 hours long when the clocks go back and 23 when they go forward, and each window starts where the one before ended", () => {
    const zone = "Europe/London";
    const back = reportMailWindow("2026-10-25", 8, zone);
    expect(back).toEqual({
      start: new Date("2026-10-24T07:00:00Z"),
      end: new Date("2026-10-25T08:00:00Z"),
    });
    expect(reportMailWindow("2026-10-26", 8, zone).start).toEqual(back.end);

    const forward = reportMailWindow("2027-03-28", 8, zone);
    expect(forward).toEqual({
      start: new Date("2027-03-27T08:00:00Z"),
      end: new Date("2027-03-28T07:00:00Z"),
    });
    expect(reportMailWindow("2027-03-29", 8, zone).start).toEqual(forward.end);
  });

  it("ends when the report first falls due, on an hour the clocks repeat or skip", () => {
    const zone = "Europe/London";
    expect(reportMailWindow("2026-10-25", 1, zone).end).toEqual(
      new Date("2026-10-25T00:00:00Z"),
    );
    expect(reportMailWindow("2027-03-28", 1, zone).end).toEqual(
      new Date("2027-03-28T01:00:00Z"),
    );
  });
});

describe("addDays", () => {
  it("crosses month and year ends", () => {
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
});
