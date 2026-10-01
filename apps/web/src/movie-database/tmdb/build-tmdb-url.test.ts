import { describe, expect, it } from "vitest";
import { buildTmdbUrl } from "./build-tmdb-url";

describe("buildTmdbUrl", () => {
  const BASE = "https://api.themoviedb.org/3/discover/movie";

  it("returns the base URL when no params are given", () => {
    expect(buildTmdbUrl({ baseUrl: BASE })).toBe(BASE);
  });

  it("returns the base URL when params is empty", () => {
    expect(buildTmdbUrl({ baseUrl: BASE, params: {} })).toBe(BASE);
  });

  it("appends string params", () => {
    const url = buildTmdbUrl({
      baseUrl: BASE,
      params: { sort_by: "popularity.desc" },
    });
    expect(url).toBe(`${BASE}?sort_by=popularity.desc`);
  });

  it("appends number params as strings", () => {
    const url = buildTmdbUrl({ baseUrl: BASE, params: { page: 2 } });
    expect(url).toBe(`${BASE}?page=2`);
  });

  it("appends boolean params as strings", () => {
    const url = buildTmdbUrl({
      baseUrl: BASE,
      params: { include_adult: false },
    });
    expect(url).toBe(`${BASE}?include_adult=false`);
  });

  it("omits null values", () => {
    const url = buildTmdbUrl({
      baseUrl: BASE,
      params: { page: 1, with_genres: null },
    });
    expect(url).toBe(`${BASE}?page=1`);
  });

  it("omits undefined values", () => {
    const url = buildTmdbUrl({
      baseUrl: BASE,
      params: { page: 1, sort_by: undefined },
    });
    expect(url).toBe(`${BASE}?page=1`);
  });

  it("omits language=en as a TMDB API default", () => {
    const url = buildTmdbUrl({
      baseUrl: BASE,
      params: { page: 1, language: "en" },
    });
    expect(url).toBe(`${BASE}?page=1`);
  });

  it("keeps non-English language values", () => {
    const url = buildTmdbUrl({
      baseUrl: BASE,
      params: { language: "zh" },
    });
    expect(url).toBe(`${BASE}?language=zh`);
  });

  it("combines multiple params", () => {
    const url = buildTmdbUrl({
      baseUrl: BASE,
      params: {
        page: 1,
        sort_by: "vote_average.desc",
        language: "zh",
        "vote_count.gte": 300,
      },
    });

    const parsed = new URL(url);
    expect(parsed.searchParams.get("page")).toBe("1");
    expect(parsed.searchParams.get("sort_by")).toBe("vote_average.desc");
    expect(parsed.searchParams.get("language")).toBe("zh");
    expect(parsed.searchParams.get("vote_count.gte")).toBe("300");
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
