import { describe, expect, it } from "vitest";
import { lateReport } from "./late-report.ts";

const base = {
  timeZone: "Europe/London",
  reportHour: 8,
  newestReportDate: "2026-11-08",
  reportRunning: false,
  hasMailbox: true,
};

describe("lateReport", () => {
  it("is late after the report hour while today has no report, with the next hour as the next try", () => {
    expect(
      lateReport({ ...base, now: new Date("2026-11-09T09:20:00Z") }),
    ).toEqual({ nextTryHour: 10 });
  });

  it("is not late before the report hour or once today's report is there", () => {
    expect(
      lateReport({ ...base, now: new Date("2026-11-09T07:20:00Z") }),
    ).toBeNull();
    expect(
      lateReport({
        ...base,
        newestReportDate: "2026-11-09",
        now: new Date("2026-11-09T09:20:00Z"),
      }),
    ).toBeNull();
  });

  it("is not late while the report is being written", () => {
    expect(
      lateReport({
        ...base,
        reportRunning: true,
        now: new Date("2026-11-09T09:20:00Z"),
      }),
    ).toBeNull();
  });
});
