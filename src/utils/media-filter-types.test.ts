import { describe, expect, it } from "vitest";
import { isGenreFilterType, isMediaType, isSort } from "./media-filter-types";

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

describe("isSort", () => {
  it("returns true for valid sort values", () => {
    expect(isSort("popularity.asc")).toBe(true);
    expect(isSort("popularity.desc")).toBe(true);
    expect(isSort("vote_average.asc")).toBe(true);
    expect(isSort("vote_average.desc")).toBe(true);
  });

  it("returns false for invalid sort values", () => {
    expect(isSort("name.asc")).toBe(false);
    expect(isSort("popularity")).toBe(false);
    expect(isSort("")).toBe(false);
  });

  it("returns false for non-string values", () => {
    expect(isSort(null)).toBe(false);
    expect(isSort(undefined)).toBe(false);
    expect(isSort(123)).toBe(false);
  });
});

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
