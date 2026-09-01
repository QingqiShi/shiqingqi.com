/**
 * TMDB API response types derived from the auto-generated OpenAPI definitions,
 * plus the shapes the ingest job passes between its own modules.
 * Only DailyExportEntry is hand-written (daily export files aren't an API endpoint).
 */

import type { operations } from "@tuja/tmdb-types/openapi";
import type { z } from "zod";
import type { dailyExportEntrySchema } from "./daily-export-entry-schema.ts";
import type { VectorRecord } from "./vector-record.ts";

/** Extract the JSON response type from a TMDB API operation. */
type OperationResponse<T extends keyof operations> = operations[T] extends {
  responses: { 200: { content: { "application/json": infer R } } };
}
  ? R
  : never;

// Base response types from individual operations
type MovieDetailsBase = OperationResponse<"movie-details">;
type MovieCredits = OperationResponse<"movie-credits">;
type MovieKeywords = OperationResponse<"movie-keywords">;
type MovieWatchProviders = OperationResponse<"movie-watch-providers">;

type TvDetailsBase = OperationResponse<"tv-series-details">;
type TvCredits = OperationResponse<"tv-series-credits">;
type TvKeywords = OperationResponse<"tv-series-keywords">;
type TvWatchProviders = OperationResponse<"tv-series-watch-providers">;

/** Combined movie detail response when using append_to_response=credits,keywords,watch/providers */
export type TmdbMovieDetail = MovieDetailsBase & {
  credits: MovieCredits;
  keywords: MovieKeywords;
  "watch/providers": MovieWatchProviders;
};

/** Combined TV detail response when using append_to_response=credits,keywords,watch/providers */
export type TmdbTvDetail = TvDetailsBase & {
  credits: TvCredits;
  keywords: TvKeywords;
  "watch/providers": TvWatchProviders;
};

/** Changes list response (movie and TV share the same shape). */
export type TmdbChangesResponse = OperationResponse<"changes-movie-list">;

/** Trending list response (movie and TV share the same shape). */
export type TmdbTrendingResponse = OperationResponse<"trending-movies">;

// Sub-type aliases for use in function signatures.
// TV cast type used as the base because it's a superset of fields common to both movie/TV.
export type TmdbCastMember = NonNullable<TvCredits["cast"]>[number];
export type TmdbCrewMember = NonNullable<TvCredits["crew"]>[number];

/** Watch provider results, keyed by country code. */
export type TmdbWatchProviderResults = NonNullable<
  MovieWatchProviders["results"]
>;

/** Single country's watch provider data. */
export type TmdbWatchProviderCountry = NonNullable<
  TmdbWatchProviderResults["US"]
>;

/** Daily export file entry (not an API response — hand-written). */
export type DailyExportEntry = z.infer<typeof dailyExportEntrySchema>;

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
