import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "#src/testing/test-msw.ts";
import { TmdbNotFoundError, tmdbGet } from "./tmdb-get";

const MOVIE_URL = "https://api.themoviedb.org/3/movie/23447";

function getMovie() {
  return tmdbGet("/3/movie/{movie_id}", {}, { movie_id: "23447" });
}

beforeEach(() => {
  vi.stubEnv("TMDB_API_TOKEN", "test-token");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("tmdbGet", () => {
  it("throws a TmdbNotFoundError when TMDB has no such record", async () => {
    server.use(
      http.get(MOVIE_URL, () =>
        HttpResponse.json(
          { success: false, status_code: 34 },
          { status: 404, statusText: "Not Found" },
        ),
      ),
    );

    await expect(getMovie()).rejects.toThrow(
      new TmdbNotFoundError(
        "Failed to fetch /3/movie/{movie_id} (404:Not Found)",
      ),
    );
  });

  it("throws a plain Error for other failures", async () => {
    server.use(
      http.get(MOVIE_URL, () =>
        HttpResponse.json(
          {},
          { status: 503, statusText: "Service Unavailable" },
        ),
      ),
    );

    const error: unknown = await getMovie().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(TmdbNotFoundError);
    expect(error).toHaveProperty(
      "message",
      "Failed to fetch /3/movie/{movie_id} (503:Service Unavailable)",
    );
  });
});
