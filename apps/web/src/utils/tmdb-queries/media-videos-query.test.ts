import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "#src/test-msw.ts";
import { callQueryFn } from "./call-query-fn";
import { mediaVideosQuery } from "./media-videos-query";

function videosResponse(
  results: { key: string; type: string; official: boolean }[] = [],
) {
  return { id: 1, results };
}

describe("mediaVideosQuery", () => {
  it("fetches movie videos with movie_id", async () => {
    let requestUrl = "";
    server.use(
      http.get("*/api/tmdb/get-movie-videos", ({ request }) => {
        requestUrl = request.url;
        return HttpResponse.json(
          videosResponse([{ key: "abc123", type: "Trailer", official: true }]),
        );
      }),
    );

    const options = mediaVideosQuery({
      type: "movie",
      id: "550",
      language: "en",
    });
    const result = await callQueryFn(options);

    const url = new URL(requestUrl);
    expect(url.searchParams.get("movie_id")).toBe("550");
    expect(result.results).toHaveLength(1);
    expect(result.results?.[0]?.key).toBe("abc123");
  });

  it("fetches TV videos with series_id", async () => {
    let requestUrl = "";
    server.use(
      http.get("*/api/tmdb/get-tv-show-videos", ({ request }) => {
        requestUrl = request.url;
        return HttpResponse.json(videosResponse([]));
      }),
    );

    const options = mediaVideosQuery({
      type: "tv",
      id: "1399",
      language: "en",
    });
    const result = await callQueryFn(options);

    const url = new URL(requestUrl);
    expect(url.searchParams.get("series_id")).toBe("1399");
    expect(result.results).toHaveLength(0);
  });
});
