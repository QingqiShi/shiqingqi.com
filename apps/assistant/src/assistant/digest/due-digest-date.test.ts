import { describe, expect, it } from "vitest";
import { dueDigestDate } from "./due-digest-date.ts";

const london = (now: string, latestDigestDate: string | null = null) =>
  dueDigestDate({
    now: new Date(now),
    timeZone: "Europe/London",
    digestHour: 8,
    latestDigestDate,
  });

describe("dueDigestDate", () => {
  it("is due at the digest hour on the local clock, in summer time and in winter time", () => {
    expect(london("2026-07-01T06:59:00Z")).toBeNull();
    expect(london("2026-07-01T07:05:00Z")).toBe("2026-07-01");
    expect(london("2026-12-01T07:05:00Z")).toBeNull();
    expect(london("2026-12-01T08:05:00Z")).toBe("2026-12-01");
  });

  it("is due once a day: not again once the day has a digest, and again the next day", () => {
    expect(london("2026-12-01T09:05:00Z", "2026-12-01")).toBeNull();
    expect(london("2026-12-02T08:05:00Z", "2026-12-01")).toBe("2026-12-02");
  });

  it("stays due after the hour, so a missed run makes the digest late and never skips it", () => {
    expect(london("2026-12-01T15:05:00Z", "2026-11-30")).toBe("2026-12-01");
  });

  it("takes the date of the user's zone, not of UTC", () => {
    expect(
      dueDigestDate({
        now: new Date("2026-11-02T03:00:00Z"),
        timeZone: "America/Los_Angeles",
        digestHour: 8,
        latestDigestDate: "2026-11-01",
      }),
    ).toBeNull();
    expect(
      dueDigestDate({
        now: new Date("2026-11-01T00:30:00Z"),
        timeZone: "Asia/Shanghai",
        digestHour: 8,
        latestDigestDate: "2026-10-31",
      }),
    ).toBe("2026-11-01");
  });
});
