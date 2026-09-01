import { describe, expect, it } from "vitest";
import { runFull } from "./run-full.ts";
import {
  makeFakeIndex,
  makeFakeTmdb,
  makeMovieDetail,
  makeTvDetail,
} from "./test-fixtures.ts";

describe("runFull", () => {
  it("does not create vector index in dry-run mode", async () => {
    let indexCreated = false;
    const tmdb = makeFakeTmdb({
      downloadDailyExport: () =>
        Promise.resolve([{ id: 1, adult: false, popularity: 50 }]),
    });

    const stats = await runFull(
      tmdb,
      () => {
        indexCreated = true;
        return makeFakeIndex();
      },
      true,
    );

    expect(indexCreated).toBe(false);
    expect(stats).toEqual([]);
  });

  it("ingests into both locale namespaces", async () => {
    const index = makeFakeIndex();
    const tmdb = makeFakeTmdb({
      downloadDailyExport: (type) =>
        type === "movie"
          ? Promise.resolve([{ id: 1, adult: false, popularity: 50 }])
          : Promise.resolve([{ id: 2, adult: false, popularity: 50 }]),
      fetchMovieDetail: (id, _locale) =>
        Promise.resolve(makeMovieDetail({ id, vote_count: 500 })),
      fetchTvDetail: (id, _locale) =>
        Promise.resolve(makeTvDetail({ id, vote_count: 500 })),
    });

    const stats = await runFull(tmdb, () => index, false);

    expect(index.namespaces.has("en")).toBe(true);
    expect(index.namespaces.has("zh")).toBe(true);

    const enRecords = index.namespace("en").upserted.flat();
    const zhRecords = index.namespace("zh").upserted.flat();
    expect(enRecords).toHaveLength(2);
    expect(zhRecords).toHaveLength(2);

    expect(stats).toHaveLength(4); // 2 locales × 2 media types
    expect(stats.every((s) => s.otherErrors === 0)).toBe(true);
  });

  it("applies popularity filters before fetching details", async () => {
    const fetchedIds: number[] = [];
    const tmdb = makeFakeTmdb({
      downloadDailyExport: (type) =>
        type === "movie"
          ? Promise.resolve([
              { id: 1, adult: false, popularity: 0.5 },
              { id: 2, adult: false, popularity: 50 },
            ])
          : Promise.resolve([]),
      fetchMovieDetail: (id, _locale) => {
        fetchedIds.push(id);
        return Promise.resolve(makeMovieDetail({ id, vote_count: 500 }));
      },
    });

    await runFull(tmdb, () => makeFakeIndex(), false);

    // Only id=2 passes MIN_POPULARITY_MOVIE=2, fetched for both locales
    expect(fetchedIds).toEqual([2, 2]);
  });

  it("respects limit parameter", async () => {
    const fetchedIds: number[] = [];
    const tmdb = makeFakeTmdb({
      downloadDailyExport: () =>
        Promise.resolve([
          { id: 1, adult: false, popularity: 50 },
          { id: 2, adult: false, popularity: 50 },
          { id: 3, adult: false, popularity: 50 },
        ]),
      fetchMovieDetail: (id, _locale) => {
        fetchedIds.push(id);
        return Promise.resolve(makeMovieDetail({ id, vote_count: 500 }));
      },
    });

    await runFull(tmdb, () => makeFakeIndex(), false, 1);

    // Only 1 per media type, fetched for both locales
    expect(fetchedIds).toEqual([1, 1]);
  });
});
