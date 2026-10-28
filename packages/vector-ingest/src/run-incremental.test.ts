import { describe, expect, it } from "vitest";
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
});
