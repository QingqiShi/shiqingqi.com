import { describe, expect, it } from "vitest";
import { buildTmdbUrl } from "./build-tmdb-url";

describe("buildTmdbUrl", () => {
  const BASE = "https://api.themoviedb.org/3/discover/movie";

  it("returns the base URL when no params are given", () => {
    expect(buildTmdbUrl({ baseUrl: BASE })).toBe(BASE);
  });

  it("keeps non-English language values", () => {
    const url = buildTmdbUrl({
      baseUrl: BASE,
      params: { language: "zh" },
    });
    expect(url).toBe(`${BASE}?language=zh`);
  });

  it("handles a mix of set, null, and undefined params", () => {
    const url = buildTmdbUrl({
      baseUrl: BASE,
      params: {
        page: 1,
        with_genres: null,
        sort_by: undefined,
        language: "en",
        "vote_average.gte": 7,
      },
    });

    const parsed = new URL(url);
    expect(parsed.searchParams.get("page")).toBe("1");
    expect(parsed.searchParams.get("vote_average.gte")).toBe("7");
    expect(parsed.searchParams.has("with_genres")).toBe(false);
    expect(parsed.searchParams.has("sort_by")).toBe(false);
    expect(parsed.searchParams.has("language")).toBe(false);
  });
});
