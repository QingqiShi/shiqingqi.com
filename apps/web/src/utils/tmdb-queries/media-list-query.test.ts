import { hashKey, QueryClient } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "#src/test-msw.ts";
import { mediaListQuery } from "./media-list-query";

describe("mediaListQuery", () => {
  it("sends the Browse filters to Discover as TMDB params", async () => {
    let requestUrl: URL | undefined;
    server.use(
      http.get("*/api/tmdb/discover-tv-shows", ({ request }) => {
        requestUrl = new URL(request.url);
        return HttpResponse.json({
          page: 1,
          results: [],
          total_pages: 1,
          total_results: 0,
        });
      }),
    );

    await new QueryClient().infiniteQuery(
      mediaListQuery({
        type: "tv",
        page: 1,
        language: "en",
        genres: new Set(["18", "35"]),
        matchMode: "any",
        sort: "vote_average.desc",
      }),
    );

    expect(Object.fromEntries(requestUrl?.searchParams ?? [])).toEqual({
      page: "1",
      language: "en",
      with_genres: "18|35",
      sort_by: "vote_average.desc",
    });
  });

  it("gives the server prefetch and the client the same key for default filters", () => {
    const fromSearchParams = mediaListQuery({
      type: "movie",
      page: 1,
      language: "en",
      genres: [],
    });
    const fromFiltersContext = mediaListQuery({
      type: "movie",
      page: 1,
      language: "en",
      genres: new Set<string>(),
      matchMode: "all",
      sort: "popularity.desc",
    });

    expect(hashKey(fromFiltersContext.queryKey)).toBe(
      hashKey(fromSearchParams.queryKey),
    );
  });
});
