import { describe, expect, it } from "vitest";
import { calculateAge } from "./calculate-age";

describe("calculateAge", () => {
  it("calculates age when birthday has not yet occurred in the end year", () => {
    expect(calculateAge("1990-12-25", "2026-03-30")).toBe(35);
  });

  it("calculates age when birthday has already occurred in the end year", () => {
    expect(calculateAge("1990-01-01", "2026-03-30")).toBe(36);
  });

  it("handles leap year birthdays", () => {
    // Born on Feb 29, checking age on Feb 28
    expect(calculateAge("2000-02-29", "2025-02-28")).toBe(24);
    // Born on Feb 29, checking age on Mar 1
    expect(calculateAge("2000-02-29", "2025-03-01")).toBe(25);
  });

  it("uses UTC to avoid timezone-related off-by-one errors", () => {
    // "1990-01-01" parsed as Date is midnight UTC.
    // In UTC-5 timezone, local time would be Dec 31 23:00, causing
    // getFullYear() to return 1989 instead of 1990. UTC methods avoid this.
    expect(calculateAge("1990-01-01", "2026-01-01")).toBe(36);
  });
});
