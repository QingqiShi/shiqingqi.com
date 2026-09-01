import { describe, expect, it } from "vitest";
import { TRENDING_LIMIT } from "./constants.ts";
import { runIncremental } from "./run-incremental.ts";
import {
  makeFakeIndex,
  makeFakeTmdb,
  makeMovieDetail,
  makeTvDetail,
} from "./test-fixtures.ts";

describe("runIncremental", () => {
  it("fetches changes and upserts for both locales", async () => {
    const index = makeFakeIndex();
    const tmdb = makeFakeTmdb({
      fetchChanges: (type) =>
        type === "movie" ? Promise.resolve([10]) : Promise.resolve([20]),
      fetchMovieDetail: (id, _locale) =>
        Promise.resolve(makeMovieDetail({ id, vote_count: 500 })),
      fetchTvDetail: (id, _locale) =>
        Promise.resolve(makeTvDetail({ id, vote_count: 500 })),
    });

    const stats = await runIncremental(tmdb, () => index, 1, false);

    expect(index.namespaces.has("en")).toBe(true);
    expect(index.namespaces.has("zh")).toBe(true);

    const enRecords = index.namespace("en").upserted.flat();
    const zhRecords = index.namespace("zh").upserted.flat();
    expect(enRecords).toHaveLength(2);
    expect(zhRecords).toHaveLength(2);

    expect(stats).toHaveLength(4); // 2 locales × 2 media types
  });

  it("does not create vector index in dry-run mode", async () => {
    let indexCreated = false;
    const tmdb = makeFakeTmdb({
      fetchChanges: () => Promise.resolve([1, 2]),
    });

    const stats = await runIncremental(
      tmdb,
      () => {
        indexCreated = true;
        return makeFakeIndex();
      },
      1,
      true,
    );

    expect(indexCreated).toBe(false);
    expect(stats).toEqual([]);
  });

  it("respects limit parameter", async () => {
    const fetchedIds: number[] = [];
    const tmdb = makeFakeTmdb({
      fetchChanges: (type) =>
        type === "movie" ? Promise.resolve([10, 20, 30]) : Promise.resolve([]),
      fetchMovieDetail: (id, _locale) => {
        fetchedIds.push(id);
        return Promise.resolve(makeMovieDetail({ id, vote_count: 500 }));
      },
    });

    await runIncremental(tmdb, () => makeFakeIndex(), 1, false, 1);

    // Only 1 movie, fetched for both locales
    expect(fetchedIds).toEqual([10, 10]);
  });

  it("deduplicates overlapping IDs between changes and trending", async () => {
    const fetchedMovieIds: number[] = [];
    const tmdb = makeFakeTmdb({
      fetchChanges: (type) =>
        type === "movie" ? Promise.resolve([10, 20]) : Promise.resolve([]),
      fetchTrending: (type) =>
        type === "movie" ? Promise.resolve([20, 30]) : Promise.resolve([]),
      fetchMovieDetail: (id, _locale) => {
        fetchedMovieIds.push(id);
        return Promise.resolve(makeMovieDetail({ id, vote_count: 500 }));
      },
    });

    await runIncremental(tmdb, () => makeFakeIndex(), 1, false);

    // 10 from changes-only, 20+30 from trending (20 deduped from changes)
    // Each fetched for both locales
    expect(fetchedMovieIds.sort()).toEqual([10, 10, 20, 20, 30, 30]);
  });

  it("skips vote count check for trending IDs", async () => {
    const tmdb = makeFakeTmdb({
      fetchChanges: () => Promise.resolve([]),
      fetchTrending: (type) =>
        type === "movie" ? Promise.resolve([42]) : Promise.resolve([]),
      fetchMovieDetail: (id, _locale) =>
        Promise.resolve(makeMovieDetail({ id, vote_count: 0 })),
    });

    const index = makeFakeIndex();
    const stats = await runIncremental(tmdb, () => index, 1, false);

    const movieStats = stats.filter((s) => s.mediaType === "movie");
    const totalUpserted = movieStats.reduce((sum, s) => sum + s.upserted, 0);
    expect(totalUpserted).toBe(2); // once per locale
    expect(movieStats.every((s) => s.skippedVoteCount === 0)).toBe(true);
  });

  it("uses trending path for IDs in both changes and trending", async () => {
    const tmdb = makeFakeTmdb({
      fetchChanges: (type) =>
        type === "movie" ? Promise.resolve([42]) : Promise.resolve([]),
      fetchTrending: (type) =>
        type === "movie" ? Promise.resolve([42]) : Promise.resolve([]),
      fetchMovieDetail: (id, _locale) =>
        Promise.resolve(makeMovieDetail({ id, vote_count: 0 })),
    });

    const index = makeFakeIndex();
    const stats = await runIncremental(tmdb, () => index, 1, false);

    // ID 42 is in both sets — should go through trending path (no vote gate)
    const movieStats = stats.filter((s) => s.mediaType === "movie");
    const totalUpserted = movieStats.reduce((sum, s) => sum + s.upserted, 0);
    expect(totalUpserted).toBe(2); // once per locale
    expect(movieStats.every((s) => s.skippedVoteCount === 0)).toBe(true);
  });

  it("passes TRENDING_LIMIT to fetchTrending", async () => {
    let requestedLimit = 0;
    const tmdb = makeFakeTmdb({
      fetchTrending: (_type, limit) => {
        requestedLimit = limit;
        return Promise.resolve([]);
      },
    });

    await runIncremental(tmdb, () => makeFakeIndex(), 1, false);

    expect(requestedLimit).toBe(TRENDING_LIMIT);
  });
});
