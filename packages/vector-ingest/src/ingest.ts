import { appendFileSync } from "node:fs";
import { parseArgs } from "node:util";
import type { MediaMetadata } from "@tuja/tmdb-types/vector-db";
import { Index } from "@upstash/vector";
import { config } from "dotenv";
import { LOCALES, getRequiredEnv } from "./constants.ts";
import { RateLimiter } from "./rate-limiter.ts";
import { TmdbApiError, TmdbClient } from "./tmdb-client.ts";
import type {
  DailyExportEntry,
  TmdbMovieDetail,
  TmdbTvDetail,
} from "./tmdb-types.ts";
import { type VectorRecord, transformMovie, transformTv } from "./transform.ts";

config({ path: ".env.local" });

export const MIN_POPULARITY_MOVIE = 2;
export const MIN_POPULARITY_TV = 7;
export const MIN_VOTE_COUNT = 15;
export const TRENDING_LIMIT = 100;
const UPSERT_BATCH_SIZE = 100;
const DELETE_BATCH_SIZE = 100;
const CONCURRENCY = 5;

export type IngestStats = {
  locale: string;
  mediaType: "movie" | "tv";
  total: number;
  upserted: number;
  deleted: number;
  skippedVoteCount: number;
  otherErrors: number;
};

/** Subset of TmdbClient methods used by the orchestrator. */
export type TmdbFetcher = {
  downloadDailyExport: (
    type: "movie" | "tv",
    date: Date,
  ) => Promise<DailyExportEntry[]>;
  fetchMovieDetail: (id: number, locale: string) => Promise<TmdbMovieDetail>;
  fetchTvDetail: (id: number, locale: string) => Promise<TmdbTvDetail>;
  fetchChanges: (
    type: "movie" | "tv",
    startDate: string,
    endDate: string,
  ) => Promise<number[]>;
  fetchTrending: (type: "movie" | "tv", limit: number) => Promise<number[]>;
};

export type VectorNamespace = {
  upsert: (records: VectorRecord[]) => Promise<unknown>;
  delete: (ids: string[]) => Promise<unknown>;
};

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function filterExports(
  entries: DailyExportEntry[],
  minPopularity: number,
): DailyExportEntry[] {
  return entries.filter((e) => !e.adult && e.popularity >= minPopularity);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const { values } = parseArgs({
    options: {
      "dry-run": { type: "boolean", default: false },
      incremental: { type: "boolean", default: false },
      days: { type: "string", default: "1" },
      limit: { type: "string" },
    },
    strict: true,
  });

  const dryRun = values["dry-run"];
  const incremental = values.incremental;
  const days = parseInt(values.days, 10);
  const limit = values.limit ? parseInt(values.limit, 10) : undefined;

  if (Number.isNaN(days) || days < 1) {
    throw new Error(`Invalid --days value: ${values.days}`);
  }
  if (limit !== undefined && (Number.isNaN(limit) || limit < 1)) {
    throw new Error(`Invalid --limit value: ${String(values.limit)}`);
  }

  const apiToken = getRequiredEnv("TMDB_API_TOKEN");

  const rateLimiter = new RateLimiter();
  const tmdb = new TmdbClient(apiToken, rateLimiter);

  const createIndex = () =>
    new Index<MediaMetadata>({
      url: getRequiredEnv("UPSTASH_VECTOR_REST_URL"),
      token: getRequiredEnv("UPSTASH_VECTOR_REST_TOKEN"),
    });

  let allStats: IngestStats[];
  if (incremental) {
    allStats = await runIncremental(tmdb, createIndex, days, dryRun, limit);
  } else {
    allStats = await runFull(tmdb, createIndex, dryRun, limit);
  }

  writeSummary(allStats);

  const hasErrors = allStats.some((s) => s.otherErrors > 0);
  if (hasErrors) {
    process.exit(1);
  }
}

export async function runFull(
  tmdb: TmdbFetcher,
  createIndex: () => { namespace: (locale: string) => VectorNamespace },
  dryRun: boolean,
  limit?: number,
): Promise<IngestStats[]> {
  console.log("Starting full ingestion...");

  // Try today first, fall back to yesterday (exports generate ~7-8 AM UTC)
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let movieEntries: DailyExportEntry[];
  let tvEntries: DailyExportEntry[];

  try {
    console.log(`Downloading daily exports for ${formatDate(today)}...`);
    [movieEntries, tvEntries] = await Promise.all([
      tmdb.downloadDailyExport("movie", today),
      tmdb.downloadDailyExport("tv", today),
    ]);
  } catch (error: unknown) {
    console.log(
      `Today's export not available (${String(error)}), trying ${formatDate(yesterday)}...`,
    );
    [movieEntries, tvEntries] = await Promise.all([
      tmdb.downloadDailyExport("movie", yesterday),
      tmdb.downloadDailyExport("tv", yesterday),
    ]);
  }

  const filteredMovies = filterExports(movieEntries, MIN_POPULARITY_MOVIE);
  const filteredTv = filterExports(tvEntries, MIN_POPULARITY_TV);

  console.log(`\nExport stats:`);
  console.log(
    `  Movies: ${String(movieEntries.length)} total, ${String(filteredMovies.length)} after popularity >= ${String(MIN_POPULARITY_MOVIE)} filter`,
  );
  console.log(
    `  TV: ${String(tvEntries.length)} total, ${String(filteredTv.length)} after popularity >= ${String(MIN_POPULARITY_TV)} filter`,
  );
  console.log(
    `  Total to fetch: ${String(filteredMovies.length + filteredTv.length)}`,
  );

  if (dryRun) {
    console.log("\n[DRY RUN] Stopping before API calls and upserts.");
    return [];
  }

  const vectorIndex = createIndex();

  let movieIds = filteredMovies.map((e) => e.id);
  let tvIds = filteredTv.map((e) => e.id);

  if (limit !== undefined) {
    console.log(`\n  Limiting to ${String(limit)} per media type`);
    movieIds = movieIds.slice(0, limit);
    tvIds = tvIds.slice(0, limit);
  }

  const allStats: IngestStats[] = [];

  for (const locale of LOCALES) {
    console.log(`\nIngesting locale: ${locale}`);
    const ns = vectorIndex.namespace(locale);

    console.log(`  Fetching and upserting movies...`);
    allStats.push(await fetchAndUpsert(tmdb, movieIds, "movie", locale, ns));

    console.log(`  Fetching and upserting TV shows...`);
    allStats.push(await fetchAndUpsert(tmdb, tvIds, "tv", locale, ns));
  }

  console.log("\nFull ingestion complete.");
  return allStats;
}

export async function runIncremental(
  tmdb: TmdbFetcher,
  createIndex: () => { namespace: (locale: string) => VectorNamespace },
  days: number,
  dryRun: boolean,
  limit?: number,
): Promise<IngestStats[]> {
  console.log(
    `Starting incremental ingestion (last ${String(days)} day(s))...`,
  );

  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);

  const [changedMovieIds, changedTvIds, trendingMovieIds, trendingTvIds] =
    await Promise.all([
      tmdb.fetchChanges("movie", formatDate(startDate), formatDate(endDate)),
      tmdb.fetchChanges("tv", formatDate(startDate), formatDate(endDate)),
      tmdb.fetchTrending("movie", TRENDING_LIMIT),
      tmdb.fetchTrending("tv", TRENDING_LIMIT),
    ]);

  // Overlapping IDs use the trending path (no vote count gate) rather than
  // the changes path, so a new release that is both trending and changed
  // still gets ingested even with 0 votes.
  const trendingMovieSet = new Set(trendingMovieIds);
  const trendingTvSet = new Set(trendingTvIds);
  const changesOnlyMovieIds = changedMovieIds.filter(
    (id) => !trendingMovieSet.has(id),
  );
  const changesOnlyTvIds = changedTvIds.filter((id) => !trendingTvSet.has(id));

  console.log(
    `Changes: ${String(changedMovieIds.length)} movies, ${String(changedTvIds.length)} TV shows`,
  );
  console.log(
    `Trending: ${String(trendingMovieIds.length)} movies, ${String(trendingTvIds.length)} TV shows`,
  );

  if (dryRun) {
    console.log("\n[DRY RUN] Stopping before API calls and upserts.");
    return [];
  }

  type IngestBatch = {
    ids: number[];
    mediaType: "movie" | "tv";
    label: string;
    minVoteCount: number;
  };

  const batches: IngestBatch[] = [
    {
      ids: changesOnlyMovieIds,
      mediaType: "movie",
      label: "changed",
      minVoteCount: MIN_VOTE_COUNT,
    },
    {
      ids: changesOnlyTvIds,
      mediaType: "tv",
      label: "changed",
      minVoteCount: MIN_VOTE_COUNT,
    },
    {
      ids: trendingMovieIds,
      mediaType: "movie",
      label: "trending",
      minVoteCount: 0,
    },
    { ids: trendingTvIds, mediaType: "tv", label: "trending", minVoteCount: 0 },
  ];

  if (limit !== undefined) {
    console.log(`  Limiting to ${String(limit)} per media type`);
    for (const batch of batches) {
      batch.ids = batch.ids.slice(0, limit);
    }
  }

  const vectorIndex = createIndex();
  const allStats: IngestStats[] = [];

  for (const locale of LOCALES) {
    console.log(`\nIngesting locale: ${locale}`);
    const ns = vectorIndex.namespace(locale);

    for (const batch of batches) {
      if (batch.ids.length > 0) {
        const label = batch.mediaType === "tv" ? "TV shows" : "movies";
        console.log(
          `  Fetching and upserting ${String(batch.ids.length)} ${batch.label} ${label}...`,
        );
        allStats.push(
          await fetchAndUpsert(
            tmdb,
            batch.ids,
            batch.mediaType,
            locale,
            ns,
            batch.minVoteCount,
          ),
        );
      }
    }
  }

  console.log("\nIncremental ingestion complete.");
  return allStats;
}

async function upsertWithRetry(
  namespace: VectorNamespace,
  records: VectorRecord[],
): Promise<number> {
  try {
    await namespace.upsert(records);
    return records.length;
  } catch (firstError) {
    console.error(`    Upsert failed, retrying: ${String(firstError)}`);
    await sleep(1000);
    try {
      await namespace.upsert(records);
      return records.length;
    } catch (retryError) {
      console.error(
        `    Upsert retry failed, skipping batch of ${String(records.length)}: ${String(retryError)}`,
      );
      return 0;
    }
  }
}

export async function fetchAndUpsert(
  tmdb: Pick<TmdbFetcher, "fetchMovieDetail" | "fetchTvDetail">,
  ids: number[],
  mediaType: "movie" | "tv",
  locale: string,
  namespace: VectorNamespace,
  minVoteCount = MIN_VOTE_COUNT,
): Promise<IngestStats> {
  let processed = 0;
  let upserted = 0;
  let skippedVoteCount = 0;
  let notFoundErrors = 0;
  let otherErrors = 0;
  const batch: VectorRecord[] = [];
  const toDelete: string[] = [];

  // Process IDs with controlled concurrency
  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const chunk = ids.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      chunk.map(async (id) => {
        if (mediaType === "movie") {
          const detail = await tmdb.fetchMovieDetail(id, locale);
          if (detail.vote_count < minVoteCount) return null;
          return transformMovie(detail);
        }
        const detail = await tmdb.fetchTvDetail(id, locale);
        if (detail.vote_count < minVoteCount) return null;
        return transformTv(detail);
      }),
    );

    for (const [idx, result] of results.entries()) {
      processed++;
      if (result.status === "rejected") {
        const id = chunk[idx];
        if (
          result.reason instanceof TmdbApiError &&
          result.reason.statusCode === 404
        ) {
          notFoundErrors++;
          toDelete.push(`${mediaType}-${String(id)}`);
        } else {
          otherErrors++;
          if (otherErrors <= 10) {
            console.error(`    Error: ${String(result.reason)}`);
          }
        }
        continue;
      }
      if (result.value === null) {
        skippedVoteCount++;
        continue;
      }
      batch.push(result.value);
    }

    // Flush delete batch
    if (toDelete.length >= DELETE_BATCH_SIZE) {
      const idsToDelete = toDelete.splice(0);
      await namespace.delete(idsToDelete);
    }

    // Flush upsert batch when full
    if (batch.length >= UPSERT_BATCH_SIZE) {
      const toUpsert = batch.splice(0);
      const count = await upsertWithRetry(namespace, toUpsert);
      upserted += count;
      otherErrors += toUpsert.length - count;
    }

    // Progress logging
    if (processed % 500 === 0 || processed === ids.length) {
      console.log(
        `    Progress: ${String(processed)}/${String(ids.length)} processed, ${String(upserted + batch.length)} upserted, ${String(notFoundErrors)} deleted, ${String(skippedVoteCount)} skipped (low votes), ${String(otherErrors)} errors`,
      );
    }
  }

  // Flush remaining deletes
  if (toDelete.length > 0) {
    await namespace.delete(toDelete.splice(0));
  }

  // Flush remaining upserts
  if (batch.length > 0) {
    const toUpsert = batch.splice(0);
    const count = await upsertWithRetry(namespace, toUpsert);
    upserted += count;
    otherErrors += toUpsert.length - count;
  }

  console.log(
    `    Done: ${String(upserted)} upserted, ${String(notFoundErrors)} deleted, ${String(skippedVoteCount)} skipped, ${String(otherErrors)} errors`,
  );

  return {
    locale,
    mediaType,
    total: ids.length,
    upserted,
    deleted: notFoundErrors,
    skippedVoteCount,
    otherErrors,
  };
}

export function writeSummary(allStats: IngestStats[]) {
  if (allStats.length === 0) return;

  const summaryPath = process.env["GITHUB_STEP_SUMMARY"];
  const mdLines = summaryPath
    ? [
        "## Vector Ingestion Summary",
        "",
        "| Locale | Type | Total | Upserted | Deleted | Skipped | Errors |",
        "|--------|------|-------|----------|---------|---------|--------|",
      ]
    : undefined;

  console.log("\n=== Ingestion Summary ===");
  console.log("Locale | Type  | Total | Upserted | Deleted | Skipped | Errors");
  console.log("-------|-------|-------|----------|---------|---------|-------");

  for (const s of allStats) {
    console.log(
      `${s.locale.padEnd(6)} | ${s.mediaType.padEnd(5)} | ${String(s.total).padStart(5)} | ${String(s.upserted).padStart(8)} | ${String(s.deleted).padStart(7)} | ${String(s.skippedVoteCount).padStart(7)} | ${String(s.otherErrors).padStart(6)}`,
    );
    if (s.deleted > 0) {
      console.log(
        `::notice::${s.locale}/${s.mediaType}: deleted ${String(s.deleted)} stale vectors (TMDB 404)`,
      );
    }
    if (s.otherErrors > 0) {
      console.log(
        `::warning::${s.locale}/${s.mediaType}: ${String(s.otherErrors)} unexpected errors`,
      );
    }
    mdLines?.push(
      `| ${s.locale} | ${s.mediaType} | ${String(s.total)} | ${String(s.upserted)} | ${String(s.deleted)} | ${String(s.skippedVoteCount)} | ${String(s.otherErrors)} |`,
    );
  }

  if (summaryPath && mdLines) {
    mdLines.push("");
    appendFileSync(summaryPath, mdLines.join("\n"));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
