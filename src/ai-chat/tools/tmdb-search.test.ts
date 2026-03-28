import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "#src/test-msw.ts";
import { createTmdbSearchTool, tmdbSearchInputSchema } from "./tmdb-search";

const TMDB_BASE = "https://api.themoviedb.org";

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

describe("tmdbSearchInputSchema", () => {
  it("accepts a valid query", () => {
    const result = tmdbSearchInputSchema.parse({ query: "Inception" });
    expect(result.query).toBe("Inception");
  });

  it("rejects missing query", () => {
    expect(() => tmdbSearchInputSchema.parse({})).toThrow();
  });

  it("rejects non-string query", () => {
    expect(() => tmdbSearchInputSchema.parse({ query: 42 })).toThrow();
  });
});

describe("createTmdbSearchTool", () => {
  it("returns a tool with description and inputSchema", () => {
    const tool = createTmdbSearchTool("en");
    expect(tool.description).toBeDefined();
    expect(tool.description).toContain("TMDB");
    expect(tool.inputSchema).toBeDefined();
  });

  it("returns a tool with an execute function", () => {
    const tool = createTmdbSearchTool("en");
    expect(tool.execute).toBeDefined();
    expect(typeof tool.execute).toBe("function");
  });

  it("creates separate tool instances per locale", () => {
    const enTool = createTmdbSearchTool("en");
    const zhTool = createTmdbSearchTool("zh");
    expect(enTool).not.toBe(zhTool);
  });
});

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
    const results = await tool.execute!(
      { query: "Dune" },
      {
        toolCallId: "test",
        messages: [],
        abortSignal: AbortSignal.timeout(5000),
      },
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
      movieResult({ id: i + 1, title: `Movie ${i + 1}` }),
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
    const items = await tool.execute!(
      { query: "Movie" },
      {
        toolCallId: "test",
        messages: [],
        abortSignal: AbortSignal.timeout(5000),
      },
    );

    expect(items).toHaveLength(10);
  });

  it("returns empty array when no results", async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/search/multi`, () =>
        HttpResponse.json({
          page: 1,
          results: [],
          total_pages: 0,
          total_results: 0,
        }),
      ),
    );

    const tool = createTmdbSearchTool("en");
    const results = await tool.execute!(
      { query: "xyznonexistent" },
      {
        toolCallId: "test",
        messages: [],
        abortSignal: AbortSignal.timeout(5000),
      },
    );

    expect(results).toEqual([]);
  });

  it("passes locale as language parameter", async () => {
    let capturedLanguage: string | null = null;

    server.use(
      http.get(`${TMDB_BASE}/3/search/multi`, ({ request }) => {
        const url = new URL(request.url);
        capturedLanguage = url.searchParams.get("language");
        return HttpResponse.json({
          page: 1,
          results: [movieResult({ id: 1, title: "기생충" })],
          total_pages: 1,
          total_results: 1,
        });
      }),
    );

    const tool = createTmdbSearchTool("zh");
    await tool.execute!(
      { query: "Parasite" },
      {
        toolCallId: "test",
        messages: [],
        abortSignal: AbortSignal.timeout(5000),
      },
    );

    expect(capturedLanguage).toBe("zh");
  });

  it("passes query parameter correctly", async () => {
    let capturedQuery: string | null = null;

    server.use(
      http.get(`${TMDB_BASE}/3/search/multi`, ({ request }) => {
        const url = new URL(request.url);
        capturedQuery = url.searchParams.get("query");
        return HttpResponse.json({
          page: 1,
          results: [],
          total_pages: 0,
          total_results: 0,
        });
      }),
    );

    const tool = createTmdbSearchTool("en");
    await tool.execute!(
      { query: "Breaking Bad" },
      {
        toolCallId: "test",
        messages: [],
        abortSignal: AbortSignal.timeout(5000),
      },
    );

    expect(capturedQuery).toBe("Breaking Bad");
  });

  it("strips extra fields from results", async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/search/multi`, () =>
        HttpResponse.json({
          page: 1,
          results: [movieResult({ id: 1, title: "Inception" })],
          total_pages: 1,
          total_results: 1,
        }),
      ),
    );

    const tool = createTmdbSearchTool("en");
    const results = await tool.execute!(
      { query: "Inception" },
      {
        toolCallId: "test",
        messages: [],
        abortSignal: AbortSignal.timeout(5000),
      },
    );

    const items = results as unknown[];
    const result = items[0] as Record<string, unknown>;
    const keys = Object.keys(result);
    expect(keys).not.toContain("adult");
    expect(keys).toContain("poster_path");
    expect(keys).not.toContain("video");
    expect(keys).not.toContain("vote_count");
    expect(keys).toContain("id");
    expect(keys).toContain("media_type");
    expect(keys).toContain("title");
    expect(keys).toContain("overview");
  });

  it("includes first_air_date for TV results", async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/search/multi`, () =>
        HttpResponse.json({
          page: 1,
          results: [tvResult({ id: 1, name: "Breaking Bad" })],
          total_pages: 1,
          total_results: 1,
        }),
      ),
    );

    const tool = createTmdbSearchTool("en");
    const results = await tool.execute!(
      { query: "Breaking Bad" },
      {
        toolCallId: "test",
        messages: [],
        abortSignal: AbortSignal.timeout(5000),
      },
    );

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(
      expect.objectContaining({
        id: 1,
        name: "Breaking Bad",
        media_type: "tv",
        first_air_date: "2023-06-01",
      }),
    );
  });
});
