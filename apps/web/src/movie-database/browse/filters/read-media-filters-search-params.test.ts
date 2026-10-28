import { describe, expect, it } from "vitest";
import { readMediaFiltersSearchParams } from "./read-media-filters-search-params";

describe("readMediaFiltersSearchParams", () => {
  it("returns defaults for empty search params", () => {
    expect(readMediaFiltersSearchParams(new URLSearchParams())).toEqual({
      genres: [],
      matchMode: undefined,
      sort: undefined,
      mediaType: "movie",
      view: undefined,
    });
  });

  it('reads mediaType "tv" only when type is exactly "tv"', () => {
    expect(
      readMediaFiltersSearchParams(new URLSearchParams("type=tv")).mediaType,
    ).toBe("tv");
    expect(
      readMediaFiltersSearchParams(new URLSearchParams("type=movie")).mediaType,
    ).toBe("movie");
    expect(
      readMediaFiltersSearchParams(new URLSearchParams("type=bogus")).mediaType,
    ).toBe("movie");
  });

  it("collects every repeated genre param", () => {
    expect(
      readMediaFiltersSearchParams(new URLSearchParams("genre=28&genre=12"))
        .genres,
    ).toEqual(["28", "12"]);
  });

  it("drops an invalid sort", () => {
    expect(
      readMediaFiltersSearchParams(new URLSearchParams("sort=name.asc")).sort,
    ).toBeUndefined();
  });
});
