import { http, HttpResponse } from "msw";
import { beforeAll, describe, expect, it } from "vitest";
import { server } from "#src/testing/test-msw.ts";
import { createTmdbSearchTool } from "./create-tmdb-search-tool";
import { isToolError } from "./tool-error";
import { TMDB_BASE, toolExecutionOptions } from "./tool-execution-options";

beforeAll(() => {
  process.env.TMDB_API_TOKEN = "test-token";
});

function movieResult(overrides: { id: number; title: string }) {
  return {
    adult: false,
    id: overrides.id,
    title: overrides.title,
    media_type: "movie",
    overview: "A test movie overview",
    release_date: "2023-01-01",
    vote_average: 7.5,
    vote_count: 100,
    genre_ids: [28, 878],
    original_language: "en",
    original_title: overrides.title,
    popularity: 50,
    video: false,
  };
}

function tvResult(overrides: { id: number; name: string }) {
  return {
    adult: false,
    id: overrides.id,
    name: overrides.name,
    media_type: "tv",
    overview: "A test TV overview",
    first_air_date: "2023-06-01",
    vote_average: 8.0,
    vote_count: 200,
    genre_ids: [18],
    original_language: "en",
    original_name: overrides.name,
    popularity: 60,
    origin_country: ["US"],
  };
}

function personResult(overrides: { id: number; name: string }) {
  return {
    adult: false,
    id: overrides.id,
    name: overrides.name,
    media_type: "person",
    popularity: 40,
    original_name: overrides.name,
  };
}

describe("tmdb search execute", () => {
  it("returns movies, TV shows, and people from a single search", async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/search/multi`, () =>
        HttpResponse.json({
          page: 1,
          results: [
            movieResult({ id: 1, title: "Dune" }),
            tvResult({ id: 2, name: "Dune: Prophecy" }),
            personResult({ id: 3, name: "Timothée Chalamet" }),
          ],
          total_pages: 1,
          total_results: 3,
        }),
      ),
    );

    const tool = createTmdbSearchTool("en");
    const results = await tool.execute(
      { query: "Dune" },
      toolExecutionOptions(),
    );

    expect(results).toHaveLength(3);
    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 1,
          title: "Dune",
          media_type: "movie",
        }),
        expect.objectContaining({
          id: 2,
          name: "Dune: Prophecy",
          media_type: "tv",
        }),
        expect.objectContaining({
          id: 3,
          name: "Timothée Chalamet",
          media_type: "person",
        }),
      ]),
    );
  });

  it("caps results at 10", async () => {
    const results = Array.from({ length: 15 }, (_, i) =>
      movieResult({ id: i + 1, title: `Movie ${String(i + 1)}` }),
    );

    server.use(
      http.get(`${TMDB_BASE}/3/search/multi`, () =>
        HttpResponse.json({
          page: 1,
          results,
          total_pages: 1,
          total_results: 15,
        }),
      ),
    );

    const tool = createTmdbSearchTool("en");
    const items = await tool.execute(
      { query: "Movie" },
      toolExecutionOptions(),
    );

    expect(items).toHaveLength(10);
  });

  it("returns a structured tool error when TMDB fails", async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/search/multi`, () =>
        HttpResponse.json(
          { status_code: 25, status_message: "Rate limit exceeded" },
          { status: 429 },
        ),
      ),
    );

    const tool = createTmdbSearchTool("en");
    const result = await tool.execute(
      { query: "Dune" },
      toolExecutionOptions(),
    );

    expect(isToolError(result)).toBe(true);
    if (isToolError(result)) {
      expect(result.reason).toBe("tmdb_unavailable");
      expect(result.message.length).toBeGreaterThan(0);
    }
  });
});
