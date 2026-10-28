import { describe, expect, it } from "vitest";
import { MIN_VOTE_COUNT } from "./constants.ts";
import { fetchAndUpsert } from "./fetch-and-upsert.ts";
import {
  makeFakeNamespace,
  makeFakeTmdb,
  makeMovieDetail,
  makeTvDetail,
} from "./test-fixtures.ts";
import { TmdbApiError } from "./tmdb-client.ts";

describe("fetchAndUpsert", () => {
  it("skips titles below vote count threshold", async () => {
    const ns = makeFakeNamespace();
    const tmdb = makeFakeTmdb({
      fetchMovieDetail: (id, _locale) =>
        Promise.resolve(
          makeMovieDetail({
            id,
            vote_count: id === 1 ? 500 : MIN_VOTE_COUNT - 1,
          }),
        ),
    });

    const result = await fetchAndUpsert(tmdb, [1, 2, 3], "movie", "en", ns);

    expect(result.upserted).toBe(1);
    expect(result.skippedVoteCount).toBe(2);
  });

  it("counts non-404 errors as otherErrors without stopping", async () => {
    const ns = makeFakeNamespace();
    const tmdb = makeFakeTmdb({
      fetchMovieDetail: (id, _locale) => {
        if (id === 2) return Promise.reject(new Error("API error"));
        return Promise.resolve(makeMovieDetail({ id, vote_count: 500 }));
      },
    });

    const result = await fetchAndUpsert(tmdb, [1, 2, 3], "movie", "en", ns);

    expect(result.upserted).toBe(2);
    expect(result.otherErrors).toBe(1);
    expect(result.deleted).toBe(0);
  });

  it("deletes vectors for 404 errors and counts as deleted", async () => {
    const ns = makeFakeNamespace();
    const tmdb = makeFakeTmdb({
      fetchMovieDetail: (id, _locale) => {
        if (id === 2)
          return Promise.reject(
            new TmdbApiError(404, "/3/movie/2", "Not Found"),
          );
        return Promise.resolve(makeMovieDetail({ id, vote_count: 500 }));
      },
    });

    const result = await fetchAndUpsert(tmdb, [1, 2, 3], "movie", "en", ns);

    expect(result.upserted).toBe(2);
    expect(result.deleted).toBe(1);
    expect(result.otherErrors).toBe(0);
    expect(ns.deleted.flat()).toEqual(["movie-2"]);
  });

  it("deletes TV vectors with correct ID prefix", async () => {
    const ns = makeFakeNamespace();
    const tmdb = makeFakeTmdb({
      fetchTvDetail: (id, _locale) => {
        if (id === 5)
          return Promise.reject(new TmdbApiError(404, "/3/tv/5", "Not Found"));
        return Promise.resolve(makeTvDetail({ id, vote_count: 500 }));
      },
    });

    const result = await fetchAndUpsert(tmdb, [5], "tv", "en", ns);

    expect(result.deleted).toBe(1);
    expect(ns.deleted.flat()).toEqual(["tv-5"]);
  });
});
