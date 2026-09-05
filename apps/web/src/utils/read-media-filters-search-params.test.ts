import { describe, expect, it } from "vitest";
import { readMediaFiltersSearchParams } from "./read-media-filters-search-params";

describe("readMediaFiltersSearchParams", () => {
  it("returns defaults for empty search params", () => {
    expect(readMediaFiltersSearchParams(new URLSearchParams())).toEqual({
      genres: [],
      genreFilterType: undefined,
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

  it("drops an invalid genreFilterType", () => {
    expect(
      readMediaFiltersSearchParams(new URLSearchParams("genreFilterType=some"))
        .genreFilterType,
    ).toBeUndefined();
  });

  it("keeps a valid genreFilterType", () => {
    expect(
      readMediaFiltersSearchParams(new URLSearchParams("genreFilterType=any"))
        .genreFilterType,
    ).toBe("any");
  });

  it("drops an invalid sort", () => {
    expect(
      readMediaFiltersSearchParams(new URLSearchParams("sort=name.asc")).sort,
    ).toBeUndefined();
  });

  it("keeps a valid sort", () => {
    expect(
      readMediaFiltersSearchParams(
        new URLSearchParams("sort=vote_average.desc"),
      ).sort,
    ).toBe("vote_average.desc");
  });

  it("drops an invalid view", () => {
    expect(
      readMediaFiltersSearchParams(new URLSearchParams("view=list")).view,
    ).toBeUndefined();
  });

  it("keeps a valid view", () => {
    expect(
      readMediaFiltersSearchParams(new URLSearchParams("view=table")).view,
    ).toBe("table");
  });

  it("takes the first value when a single-value param repeats", () => {
    expect(
      readMediaFiltersSearchParams(
        new URLSearchParams("sort=popularity.asc&sort=popularity.desc"),
      ).sort,
    ).toBe("popularity.asc");
  });
});
