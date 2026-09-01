import { describe, expect, it } from "vitest";
import { MIN_POPULARITY_MOVIE, MIN_POPULARITY_TV } from "./constants.ts";
import { filterExports } from "./filter-exports.ts";
import type { DailyExportEntry } from "./types.ts";

describe("filterExports", () => {
  const entries: DailyExportEntry[] = [
    { id: 1, adult: false, popularity: 0.5 },
    { id: 2, adult: false, popularity: 3.0 },
    { id: 3, adult: false, popularity: 10.0 },
    { id: 4, adult: true, popularity: 50.0 },
    { id: 5, adult: false, popularity: 1.5 },
  ];

  it("filters by movie popularity threshold", () => {
    const result = filterExports(entries, MIN_POPULARITY_MOVIE);
    expect(result.map((e) => e.id)).toEqual([2, 3]);
  });

  it("filters by TV popularity threshold", () => {
    const result = filterExports(entries, MIN_POPULARITY_TV);
    expect(result.map((e) => e.id)).toEqual([3]);
  });

  it("excludes adult content regardless of popularity", () => {
    const result = filterExports(entries, 1);
    expect(result.find((e) => e.id === 4)).toBeUndefined();
  });

  it("returns empty array for empty input", () => {
    expect(filterExports([], 5)).toEqual([]);
  });
});
