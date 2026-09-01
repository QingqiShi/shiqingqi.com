import { describe, expect, it } from "vitest";
import { isGenreFilterType } from "./genre-filter-type";

describe("isGenreFilterType", () => {
  it('returns true for "all"', () => {
    expect(isGenreFilterType("all")).toBe(true);
  });

  it('returns true for "any"', () => {
    expect(isGenreFilterType("any")).toBe(true);
  });

  it("returns false for invalid strings", () => {
    expect(isGenreFilterType("some")).toBe(false);
    expect(isGenreFilterType("none")).toBe(false);
    expect(isGenreFilterType("")).toBe(false);
  });

  it("returns false for non-string values", () => {
    expect(isGenreFilterType(null)).toBe(false);
    expect(isGenreFilterType(undefined)).toBe(false);
    expect(isGenreFilterType(42)).toBe(false);
    expect(isGenreFilterType(true)).toBe(false);
  });
});
