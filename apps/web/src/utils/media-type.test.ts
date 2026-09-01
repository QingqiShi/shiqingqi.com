import { describe, expect, it } from "vitest";
import { isMediaType } from "./media-type";

describe("isMediaType", () => {
  it('returns true for "movie"', () => {
    expect(isMediaType("movie")).toBe(true);
  });

  it('returns true for "tv"', () => {
    expect(isMediaType("tv")).toBe(true);
  });

  it("returns false for invalid strings", () => {
    expect(isMediaType("show")).toBe(false);
    expect(isMediaType("person")).toBe(false);
    expect(isMediaType("")).toBe(false);
  });

  it("returns false for non-string values", () => {
    expect(isMediaType(null)).toBe(false);
    expect(isMediaType(undefined)).toBe(false);
    expect(isMediaType(0)).toBe(false);
  });
});
