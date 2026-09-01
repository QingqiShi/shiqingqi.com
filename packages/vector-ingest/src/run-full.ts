import {
  LOCALES,
  MIN_POPULARITY_MOVIE,
  MIN_POPULARITY_TV,
} from "./constants.ts";
import { fetchAndUpsert } from "./fetch-and-upsert.ts";
import { filterExports } from "./filter-exports.ts";
import { formatDate } from "./format-date.ts";
import type {
  DailyExportEntry,
  IngestStats,
  TmdbFetcher,
  VectorNamespace,
} from "./types.ts";

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
