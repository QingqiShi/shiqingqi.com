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
import type { VectorNamespace } from "./types.ts";

describe("fetchAndUpsert", () => {
  it("upserts titles that pass vote count filter", async () => {
    const ns = makeFakeNamespace();
    const tmdb = makeFakeTmdb({
      fetchMovieDetail: (_id, _locale) =>
        Promise.resolve(makeMovieDetail({ vote_count: 500 })),
    });

    const result = await fetchAndUpsert(tmdb, [1, 2], "movie", "en", ns);

    expect(result.upserted).toBe(2);
    expect(result.skippedVoteCount).toBe(0);
    expect(ns.upserted.flat()).toHaveLength(2);
  });

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

  it("respects custom minVoteCount parameter", async () => {
    const ns = makeFakeNamespace();
    const tmdb = makeFakeTmdb({
      fetchMovieDetail: (id, _locale) =>
        Promise.resolve(makeMovieDetail({ id, vote_count: 0 })),
    });

    const result = await fetchAndUpsert(tmdb, [1, 2], "movie", "en", ns, 0);

    expect(result.upserted).toBe(2);
    expect(result.skippedVoteCount).toBe(0);
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

  it("does not throw when all errors are 404s", async () => {
    const ns = makeFakeNamespace();
    const tmdb = makeFakeTmdb({
      fetchMovieDetail: (_id, _locale) =>
        Promise.reject(new TmdbApiError(404, "/3/movie/1", "Not Found")),
    });

    const result = await fetchAndUpsert(tmdb, [1, 2, 3, 4], "movie", "en", ns);

    expect(result.deleted).toBe(4);
    expect(result.otherErrors).toBe(0);
    expect(ns.deleted.flat()).toEqual([
      "movie-1",
      "movie-2",
      "movie-3",
      "movie-4",
    ]);
  });

  it("uses fetchTvDetail for tv mediaType", async () => {
    const ns = makeFakeNamespace();
    let tvDetailCalled = false;
    const tmdb = makeFakeTmdb({
      fetchTvDetail: (_id, _locale) => {
        tvDetailCalled = true;
        return Promise.resolve(makeTvDetail({ vote_count: 500 }));
      },
    });

    await fetchAndUpsert(tmdb, [1], "tv", "en", ns);

    expect(tvDetailCalled).toBe(true);
    expect(ns.upserted.flat()[0]?.id).toBe("tv-1396");
  });

  it("generates correct vector record IDs", async () => {
    const ns = makeFakeNamespace();
    const tmdb = makeFakeTmdb({
      fetchMovieDetail: (id, _locale) =>
        Promise.resolve(makeMovieDetail({ id, vote_count: 500 })),
    });

    await fetchAndUpsert(tmdb, [42, 99], "movie", "en", ns);

    const ids = ns.upserted.flat().map((r) => r.id);
    expect(ids).toEqual(["movie-42", "movie-99"]);
  });

  it("does not throw when error rate is high (no threshold)", async () => {
    const ns = makeFakeNamespace();
    const tmdb = makeFakeTmdb({
      fetchMovieDetail: (id, _locale) => {
        if (id <= 3) return Promise.reject(new Error("bad token"));
        return Promise.resolve(makeMovieDetail({ id, vote_count: 500 }));
      },
    });

    const result = await fetchAndUpsert(
      tmdb,
      [1, 2, 3, 4, 5],
      "movie",
      "en",
      ns,
    );

    expect(result.otherErrors).toBe(3);
    expect(result.upserted).toBe(2);
  });

  it("retries upsert once on failure", async () => {
    let upsertCalls = 0;
    const ns: VectorNamespace = {
      upsert: () => {
        upsertCalls++;
        if (upsertCalls === 1) return Promise.reject(new Error("transient"));
        return Promise.resolve();
      },
      delete: () => Promise.resolve(),
    };
    const tmdb = makeFakeTmdb({
      fetchMovieDetail: (id, _locale) =>
        Promise.resolve(makeMovieDetail({ id, vote_count: 500 })),
    });

    // Generate enough records to trigger a batch flush (>= 100)
    const ids = Array.from({ length: 101 }, (_, i) => i + 1);
    const result = await fetchAndUpsert(tmdb, ids, "movie", "en", ns);

    expect(upsertCalls).toBeGreaterThanOrEqual(2);
    expect(result.upserted).toBe(101);
  });

  it("counts upsert retry failures as otherErrors", async () => {
    const ns: VectorNamespace = {
      upsert: () => Promise.reject(new Error("persistent failure")),
      delete: () => Promise.resolve(),
    };
    const tmdb = makeFakeTmdb({
      fetchMovieDetail: (id, _locale) =>
        Promise.resolve(makeMovieDetail({ id, vote_count: 500 })),
    });

    // 5 records — all fail at upsert, no threshold to trigger
    const result = await fetchAndUpsert(
      tmdb,
      [1, 2, 3, 4, 5],
      "movie",
      "en",
      ns,
    );

    expect(result.otherErrors).toBe(5);
    expect(result.upserted).toBe(0);
  });
});
