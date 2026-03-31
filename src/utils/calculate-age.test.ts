import { describe, expect, it } from "vitest";
import { calculateAge } from "./calculate-age";

describe("calculateAge", () => {
  it("calculates age for a living person", () => {
    // Use a fixed deathday to avoid test flakiness from current date
    expect(calculateAge("1990-06-15", "2026-03-30")).toBe(35);
  });

  it("calculates age when birthday has not yet occurred in the end year", () => {
    expect(calculateAge("1990-12-25", "2026-03-30")).toBe(35);
  });

  it("calculates age when birthday has already occurred in the end year", () => {
    expect(calculateAge("1990-01-01", "2026-03-30")).toBe(36);
  });

  it("returns 0 for a person born and died on the same day", () => {
    expect(calculateAge("2000-05-10", "2000-05-10")).toBe(0);
  });

  it("calculates age for a deceased person", () => {
    expect(calculateAge("1955-10-28", "2011-10-05")).toBe(55);
  });

  it("calculates age correctly on exact birthday", () => {
    expect(calculateAge("1990-03-30", "2026-03-30")).toBe(36);
  });

  it("calculates age correctly the day before birthday", () => {
    expect(calculateAge("1990-03-31", "2026-03-30")).toBe(35);
  });

  it("handles leap year birthdays", () => {
    // Born on Feb 29, checking age on Feb 28
    expect(calculateAge("2000-02-29", "2025-02-28")).toBe(24);
    // Born on Feb 29, checking age on Mar 1
    expect(calculateAge("2000-02-29", "2025-03-01")).toBe(25);
  });

  it("handles year boundaries correctly", () => {
    // Born Dec 31, checking Jan 1 of next year
    expect(calculateAge("1990-12-31", "1991-01-01")).toBe(0);
  });

  it("uses UTC to avoid timezone-related off-by-one errors", () => {
    // "1990-01-01" parsed as Date is midnight UTC.
    // In UTC-5 timezone, local time would be Dec 31 23:00, causing
    // getFullYear() to return 1989 instead of 1990. UTC methods avoid this.
    expect(calculateAge("1990-01-01", "2026-01-01")).toBe(36);
  });
});
