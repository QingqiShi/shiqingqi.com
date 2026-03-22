import { describe, it, expect } from "vitest";
import {
  type TmdbFetcher,
  type VectorNamespace,
  fetchAndUpsert,
  filterExports,
  MIN_POPULARITY_MOVIE,
  MIN_POPULARITY_TV,
  MIN_VOTE_COUNT,
  runFull,
  runIncremental,
} from "./ingest.ts";
import { makeMovieDetail, makeTvDetail } from "./test-fixtures.ts";
import type { DailyExportEntry } from "./tmdb-types.ts";
import type { VectorRecord } from "./transform.ts";

function makeFakeTmdb(overrides: Partial<TmdbFetcher> = {}): TmdbFetcher {
  return {
    downloadDailyExport: () => Promise.resolve([]),
    fetchMovieDetail: (_id, _locale) => Promise.resolve(makeMovieDetail()),
    fetchTvDetail: (_id, _locale) => Promise.resolve(makeTvDetail()),
    fetchChanges: () => Promise.resolve([]),
    ...overrides,
  };
}

function makeFakeNamespace(): VectorNamespace & { upserted: VectorRecord[][] } {
  const upserted: VectorRecord[][] = [];
  return {
    upserted,
    upsert: (records) => {
      upserted.push([...records]);
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
      return namespaces.get(locale)!;
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

  it("counts errors without stopping", async () => {
    const ns = makeFakeNamespace();
    const tmdb = makeFakeTmdb({
      fetchMovieDetail: (id, _locale) => {
        if (id === 2) return Promise.reject(new Error("API error"));
        return Promise.resolve(makeMovieDetail({ id, vote_count: 500 }));
      },
    });

    const result = await fetchAndUpsert(tmdb, [1, 2, 3], "movie", "en", ns);

    expect(result.upserted).toBe(2);
    expect(result.errors).toBe(1);
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

  it("throws when error rate exceeds threshold", async () => {
    const ns = makeFakeNamespace();
    const tmdb = makeFakeTmdb({
      fetchMovieDetail: (_id, _locale) =>
        Promise.reject(new Error("bad token")),
    });

    await expect(
      fetchAndUpsert(tmdb, [1, 2, 3, 4], "movie", "en", ns),
    ).rejects.toThrow("Error rate too high");
  });

  it("does not throw when error rate is below threshold", async () => {
    const ns = makeFakeNamespace();
    const tmdb = makeFakeTmdb({
      fetchMovieDetail: (id, _locale) => {
        if (id === 1) return Promise.reject(new Error("API error"));
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

    expect(result.errors).toBe(1);
    expect(result.upserted).toBe(4);
  });

  it("retries upsert once on failure", async () => {
    let upsertCalls = 0;
    const ns: VectorNamespace = {
      upsert: () => {
        upsertCalls++;
        if (upsertCalls === 1) return Promise.reject(new Error("transient"));
        return Promise.resolve();
      },
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

  it("throws with error details when upsert fails after retry", async () => {
    const ns: VectorNamespace = {
      upsert: () => Promise.reject(new Error("persistent failure")),
    };
    const tmdb = makeFakeTmdb({
      fetchMovieDetail: (id, _locale) =>
        Promise.resolve(makeMovieDetail({ id, vote_count: 500 })),
    });

    // 5 records — all fail at upsert, triggering error-rate threshold
    await expect(
      fetchAndUpsert(tmdb, [1, 2, 3, 4, 5], "movie", "en", ns),
    ).rejects.toThrow("Error rate too high");
  });
});

describe("runFull", () => {
  it("does not create vector index in dry-run mode", async () => {
    let indexCreated = false;
    const tmdb = makeFakeTmdb({
      downloadDailyExport: () =>
        Promise.resolve([{ id: 1, adult: false, popularity: 50 }]),
    });

    await runFull(
      tmdb,
      () => {
        indexCreated = true;
        return makeFakeIndex();
      },
      true,
    );

    expect(indexCreated).toBe(false);
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

    await runFull(tmdb, () => index, false);

    expect(index.namespaces.has("en")).toBe(true);
    expect(index.namespaces.has("zh")).toBe(true);

    const enRecords = index.namespace("en").upserted.flat();
    const zhRecords = index.namespace("zh").upserted.flat();
    expect(enRecords).toHaveLength(2);
    expect(zhRecords).toHaveLength(2);
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

    await runIncremental(tmdb, () => index, 1, false);

    expect(index.namespaces.has("en")).toBe(true);
    expect(index.namespaces.has("zh")).toBe(true);

    const enRecords = index.namespace("en").upserted.flat();
    const zhRecords = index.namespace("zh").upserted.flat();
    expect(enRecords).toHaveLength(2);
    expect(zhRecords).toHaveLength(2);
  });

  it("does not create vector index in dry-run mode", async () => {
    let indexCreated = false;
    const tmdb = makeFakeTmdb({
      fetchChanges: () => Promise.resolve([1, 2]),
    });

    await runIncremental(
      tmdb,
      () => {
        indexCreated = true;
        return makeFakeIndex();
      },
      1,
      true,
    );

    expect(indexCreated).toBe(false);
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
});
