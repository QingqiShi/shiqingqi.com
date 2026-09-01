import { describe, expect, it } from "vitest";
import { isSort } from "./sort";

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
