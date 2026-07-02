import { describe, it, expect } from "vitest";
import {
  type TmdbFetcher,
  type VectorNamespace,
  TRENDING_LIMIT,
  fetchAndUpsert,
  filterExports,
  MIN_POPULARITY_MOVIE,
  MIN_POPULARITY_TV,
  MIN_VOTE_COUNT,
  runFull,
  runIncremental,
} from "./ingest.ts";
import { makeMovieDetail, makeTvDetail } from "./test-fixtures.ts";
import { TmdbApiError } from "./tmdb-client.ts";
import type { DailyExportEntry } from "./tmdb-types.ts";
import type { VectorRecord } from "./transform.ts";

function makeFakeTmdb(overrides: Partial<TmdbFetcher> = {}): TmdbFetcher {
  const defaults: TmdbFetcher = {
    downloadDailyExport: () => Promise.resolve([]),
    fetchMovieDetail: (_id, _locale) => Promise.resolve(makeMovieDetail()),
    fetchTvDetail: (_id, _locale) => Promise.resolve(makeTvDetail()),
    fetchChanges: () => Promise.resolve([]),
    fetchTrending: () => Promise.resolve([]),
  };
  return { ...defaults, ...overrides };
}

function makeFakeNamespace(): VectorNamespace & {
  upserted: VectorRecord[][];
  deleted: string[][];
} {
  const upserted: VectorRecord[][] = [];
  const deleted: string[][] = [];
  return {
    upserted,
    deleted,
    upsert: (records) => {
      upserted.push([...records]);
      return Promise.resolve();
    },
    delete: (ids) => {
      deleted.push([...ids]);
      return Promise.resolve();
    },
  };
}

function makeFakeIndex() {
  const namespaces = new Map<string, ReturnType<typeof makeFakeNamespace>>();
  return {
    namespace(locale: string) {
      if (!namespaces.has(locale)) {
        namespaces.set(locale, makeFakeNamespace());
      }
      const ns = namespaces.get(locale);
      if (!ns) throw new Error(`expected namespace for locale ${locale}`);
      return ns;
    },
    namespaces,
  };
}

describe("filterExports", () => {
  const entries: DailyExportEntry[] = [
    { id: 1, adult: false, popularity: 0.5 },
    { id: 2, adult: false, popularity: 3.0 },
    { id: 3, adult: false, popularity: 10.0 },
    { id: 4, adult: true, popularity: 50.0 },
    { id: 5, adult: false, popularity: 1.5 },
  ];

  it("filters by movie popularity threshold", () => {
    const result = filterExports(entries, MIN_POPULARITY_MOVIE);
    expect(result.map((e) => e.id)).toEqual([2, 3]);
  });

  it("filters by TV popularity threshold", () => {
    const result = filterExports(entries, MIN_POPULARITY_TV);
    expect(result.map((e) => e.id)).toEqual([3]);
  });

  it("excludes adult content regardless of popularity", () => {
    const result = filterExports(entries, 1);
    expect(result.find((e) => e.id === 4)).toBeUndefined();
  });

  it("returns empty array for empty input", () => {
    expect(filterExports([], 5)).toEqual([]);
  });
});

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
