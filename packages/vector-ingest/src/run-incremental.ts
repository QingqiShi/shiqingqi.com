import { LOCALES, MIN_VOTE_COUNT, TRENDING_LIMIT } from "./constants.ts";
import { fetchAndUpsert } from "./fetch-and-upsert.ts";
import { formatDate } from "./format-date.ts";
import type { IngestStats, TmdbFetcher, VectorNamespace } from "./types.ts";

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
