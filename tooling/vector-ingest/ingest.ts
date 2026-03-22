import { parseArgs } from "node:util";
import { Index } from "@upstash/vector";
import { config } from "dotenv";
import type { MediaMetadata } from "../../src/vector-db/types.ts";
import { LOCALES, getRequiredEnv } from "./constants.ts";
import { RateLimiter } from "./rate-limiter.ts";
import { TmdbClient } from "./tmdb-client.ts";
import type {
  DailyExportEntry,
  TmdbMovieDetail,
  TmdbTvDetail,
} from "./tmdb-types.ts";
import { type VectorRecord, transformMovie, transformTv } from "./transform.ts";

config({ path: ".env.local" });

export const MIN_POPULARITY_MOVIE = 2;
export const MIN_POPULARITY_TV = 7;
export const MIN_VOTE_COUNT = 20;
const UPSERT_BATCH_SIZE = 100;
const CONCURRENCY = 5;
const ERROR_RATE_THRESHOLD = 0.5;

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
};

export type VectorNamespace = {
  upsert: (records: VectorRecord[]) => Promise<unknown>;
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

  const dryRun = values["dry-run"] ?? false;
  const incremental = values.incremental ?? false;
  const days = parseInt(values.days ?? "1", 10);
  const limit = values.limit ? parseInt(values.limit, 10) : undefined;

  if (Number.isNaN(days) || days < 1) {
    throw new Error(`Invalid --days value: ${values.days}`);
  }
  if (limit !== undefined && (Number.isNaN(limit) || limit < 1)) {
    throw new Error(`Invalid --limit value: ${values.limit}`);
  }

  const apiToken = getRequiredEnv("TMDB_API_TOKEN");

  const rateLimiter = new RateLimiter();
  const tmdb = new TmdbClient(apiToken, rateLimiter);

  const createIndex = () =>
    new Index<MediaMetadata>({
      url: getRequiredEnv("UPSTASH_VECTOR_REST_URL"),
      token: getRequiredEnv("UPSTASH_VECTOR_REST_TOKEN"),
    });

  if (incremental) {
    await runIncremental(tmdb, createIndex, days, dryRun, limit);
  } else {
    await runFull(tmdb, createIndex, dryRun, limit);
  }
}

export async function runFull(
  tmdb: TmdbFetcher,
  createIndex: () => { namespace: (locale: string) => VectorNamespace },
  dryRun: boolean,
  limit?: number,
) {
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
    `  Movies: ${movieEntries.length} total, ${filteredMovies.length} after popularity >= ${MIN_POPULARITY_MOVIE} filter`,
  );
  console.log(
    `  TV: ${tvEntries.length} total, ${filteredTv.length} after popularity >= ${MIN_POPULARITY_TV} filter`,
  );
  console.log(`  Total to fetch: ${filteredMovies.length + filteredTv.length}`);

  if (dryRun) {
    console.log("\n[DRY RUN] Stopping before API calls and upserts.");
    return;
  }

  const vectorIndex = createIndex();

  let movieIds = filteredMovies.map((e) => e.id);
  let tvIds = filteredTv.map((e) => e.id);

  if (limit !== undefined) {
    console.log(`\n  Limiting to ${limit} per media type`);
    movieIds = movieIds.slice(0, limit);
    tvIds = tvIds.slice(0, limit);
  }

  for (const locale of LOCALES) {
    console.log(`\nIngesting locale: ${locale}`);
    const ns = vectorIndex.namespace(locale);

    console.log(`  Fetching and upserting movies...`);
    await fetchAndUpsert(tmdb, movieIds, "movie", locale, ns);

    console.log(`  Fetching and upserting TV shows...`);
    await fetchAndUpsert(tmdb, tvIds, "tv", locale, ns);
  }

  console.log("\nFull ingestion complete.");
}

export async function runIncremental(
  tmdb: TmdbFetcher,
  createIndex: () => { namespace: (locale: string) => VectorNamespace },
  days: number,
  dryRun: boolean,
  limit?: number,
) {
  console.log(`Starting incremental ingestion (last ${days} day(s))...`);

  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);

  let [movieIds, tvIds] = await Promise.all([
    tmdb.fetchChanges("movie", formatDate(startDate), formatDate(endDate)),
    tmdb.fetchChanges("tv", formatDate(startDate), formatDate(endDate)),
  ]);

  console.log(
    `Changes found: ${movieIds.length} movies, ${tvIds.length} TV shows`,
  );

  if (dryRun) {
    console.log("\n[DRY RUN] Stopping before API calls and upserts.");
    return;
  }

  if (limit !== undefined) {
    console.log(`  Limiting to ${limit} per media type`);
    movieIds = movieIds.slice(0, limit);
    tvIds = tvIds.slice(0, limit);
  }

  const vectorIndex = createIndex();

  for (const locale of LOCALES) {
    console.log(`\nIngesting locale: ${locale}`);
    const ns = vectorIndex.namespace(locale);

    if (movieIds.length > 0) {
      console.log(`  Fetching and upserting ${movieIds.length} movies...`);
      await fetchAndUpsert(tmdb, movieIds, "movie", locale, ns);
    }

    if (tvIds.length > 0) {
      console.log(`  Fetching and upserting ${tvIds.length} TV shows...`);
      await fetchAndUpsert(tmdb, tvIds, "tv", locale, ns);
    }
  }

  console.log("\nIncremental ingestion complete.");
}

export async function fetchAndUpsert(
  tmdb: Pick<TmdbFetcher, "fetchMovieDetail" | "fetchTvDetail">,
  ids: number[],
  mediaType: "movie" | "tv",
  locale: string,
  namespace: VectorNamespace,
) {
  let processed = 0;
  let upserted = 0;
  let skippedVoteCount = 0;
  let errors = 0;
  const batch: VectorRecord[] = [];

  // Process IDs with controlled concurrency
  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const chunk = ids.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      chunk.map(async (id) => {
        if (mediaType === "movie") {
          const detail = await tmdb.fetchMovieDetail(id, locale);
          if (detail.vote_count < MIN_VOTE_COUNT) return null;
          return transformMovie(detail);
        }
        const detail = await tmdb.fetchTvDetail(id, locale);
        if (detail.vote_count < MIN_VOTE_COUNT) return null;
        return transformTv(detail);
      }),
    );

    for (const result of results) {
      processed++;
      if (result.status === "rejected") {
        errors++;
        if (errors <= 10) {
          console.error(`    Error: ${String(result.reason)}`);
        }
        continue;
      }
      if (result.value === null) {
        skippedVoteCount++;
        continue;
      }
      batch.push(result.value);
    }

    // Flush batch when full
    if (batch.length >= UPSERT_BATCH_SIZE) {
      const toUpsert = batch.splice(0);
      try {
        await namespace.upsert(toUpsert);
        upserted += toUpsert.length;
      } catch (firstError) {
        console.error(`    Upsert failed, retrying: ${String(firstError)}`);
        await sleep(1000);
        try {
          await namespace.upsert(toUpsert);
          upserted += toUpsert.length;
        } catch (retryError) {
          console.error(
            `    Upsert retry failed, skipping batch of ${toUpsert.length}: ${String(retryError)}`,
          );
          errors += toUpsert.length;
        }
      }
    }

    // Progress logging
    if (processed % 500 === 0 || processed === ids.length) {
      console.log(
        `    Progress: ${processed}/${ids.length} processed, ${upserted + batch.length} upserted, ${skippedVoteCount} skipped (low votes), ${errors} errors`,
      );
    }
  }

  // Flush remaining
  if (batch.length > 0) {
    const toUpsert = batch.splice(0);
    try {
      await namespace.upsert(toUpsert);
      upserted += toUpsert.length;
    } catch (firstError) {
      console.error(`    Upsert failed, retrying: ${String(firstError)}`);
      await sleep(1000);
      try {
        await namespace.upsert(toUpsert);
        upserted += toUpsert.length;
      } catch (retryError) {
        console.error(
          `    Upsert retry failed, skipping batch of ${toUpsert.length}: ${String(retryError)}`,
        );
        errors += toUpsert.length;
      }
    }
  }

  console.log(
    `    Done: ${upserted} upserted, ${skippedVoteCount} skipped, ${errors} errors`,
  );

  if (ids.length > 0 && errors / ids.length > ERROR_RATE_THRESHOLD) {
    throw new Error(
      `Error rate too high: ${errors}/${ids.length} (${((errors / ids.length) * 100).toFixed(1)}%) — aborting`,
    );
  }

  return { upserted, skippedVoteCount, errors };
}

main().catch((error: unknown) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
