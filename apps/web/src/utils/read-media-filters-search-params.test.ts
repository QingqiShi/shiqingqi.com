import { describe, expect, it } from "vitest";
import type { MatchMode, MediaView, Sort } from "./media-filters";
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

  it.each<MatchMode>(["all", "any"])(
    "keeps a valid genreFilterType %s",
    (value) => {
      expect(
        readMediaFiltersSearchParams(
          new URLSearchParams(`genreFilterType=${value}`),
        ).matchMode,
      ).toBe(value);
    },
  );

  it("drops an invalid genreFilterType", () => {
    expect(
      readMediaFiltersSearchParams(new URLSearchParams("genreFilterType=some"))
        .matchMode,
    ).toBeUndefined();
  });

  it("takes the first value when genreFilterType repeats", () => {
    expect(
      readMediaFiltersSearchParams(
        new URLSearchParams("genreFilterType=any&genreFilterType=all"),
      ).matchMode,
    ).toBe("any");
  });

  it.each<Sort>([
    "popularity.asc",
    "popularity.desc",
    "vote_average.asc",
    "vote_average.desc",
  ])("keeps a valid sort %s", (value) => {
    expect(
      readMediaFiltersSearchParams(new URLSearchParams(`sort=${value}`)).sort,
    ).toBe(value);
  });

  it("drops an invalid sort", () => {
    expect(
      readMediaFiltersSearchParams(new URLSearchParams("sort=name.asc")).sort,
    ).toBeUndefined();
  });

  it("takes the first value when a single-value param repeats", () => {
    expect(
      readMediaFiltersSearchParams(
        new URLSearchParams("sort=popularity.asc&sort=popularity.desc"),
      ).sort,
    ).toBe("popularity.asc");
  });

  it.each<MediaView>(["grid", "table"])("keeps a valid view %s", (value) => {
    expect(
      readMediaFiltersSearchParams(new URLSearchParams(`view=${value}`)).view,
    ).toBe(value);
  });

  it("drops an invalid view", () => {
    expect(
      readMediaFiltersSearchParams(new URLSearchParams("view=list")).view,
    ).toBeUndefined();
  });
});
