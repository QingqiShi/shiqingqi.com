import { describe, expect, it } from "vitest";
import {
  addDays,
  dedupeByMessageId,
  isInDay,
  localDayBounds,
  mailSearchRange,
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
    expect(isInDay(new Date("2026-11-01T07:00:00Z"), day)).toBe(true);
    expect(isInDay(new Date("2026-11-02T07:59:59Z"), day)).toBe(true);
    expect(isInDay(new Date("2026-11-02T08:00:00Z"), day)).toBe(false);
    expect(isInDay(new Date("2026-11-01T06:59:59Z"), day)).toBe(false);
  });
});

describe("mailSearchRange", () => {
  it("searches one day more on each side, so a server in any zone returns the whole day", () => {
    expect(mailSearchRange("2026-03-01")).toEqual({
      since: new Date("2026-02-28T00:00:00Z"),
      before: new Date("2026-03-03T00:00:00Z"),
    });
  });
});

describe("addDays", () => {
  it("crosses month and year ends", () => {
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
});

describe("dedupeByMessageId", () => {
  it("keeps the first copy of each Message-ID and the order of the rest", () => {
    expect(
      dedupeByMessageId([
        { messageId: "<a@x>", folder: "INBOX" },
        { messageId: "<b@x>", folder: "INBOX" },
        { messageId: "<a@x>", folder: "Archive" },
      ]),
    ).toEqual([
      { messageId: "<a@x>", folder: "INBOX" },
      { messageId: "<b@x>", folder: "INBOX" },
    ]);
  });
});
