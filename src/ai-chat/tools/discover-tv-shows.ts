import { tool } from "ai";
import { z } from "zod";
import { discoverTvShows } from "#src/_generated/tmdb-server-functions.ts";
import type { SupportedLocale } from "#src/types.ts";

export const discoverTvShowsInputSchema = z.object({
  sort_by: z
    .union([
      z.literal("popularity.asc"),
      z.literal("popularity.desc"),
      z.literal("vote_average.asc"),
      z.literal("vote_average.desc"),
      z.literal("vote_count.asc"),
      z.literal("vote_count.desc"),
      z.literal("first_air_date.asc"),
      z.literal("first_air_date.desc"),
    ])
    .optional()
    .describe(
      'Sort order for results. Default is "popularity.desc". ' +
        "Common choices: popularity.desc (trending), vote_average.desc (highest rated), " +
        "first_air_date.desc (newest).",
    ),
  with_genres: z
    .string()
    .optional()
    .describe(
      "Comma-separated TMDB genre IDs to include. " +
        "TV genre IDs: 10759=Action & Adventure, 16=Animation, 35=Comedy, 80=Crime, " +
        "99=Documentary, 18=Drama, 10751=Family, 10762=Kids, 9648=Mystery, " +
        "10763=News, 10764=Reality, 10765=Sci-Fi & Fantasy, 10766=Soap, " +
        '10767=Talk, 10768=War & Politics, 37=Western. Example: "18,80" for Crime Drama.',
    ),
  without_genres: z
    .string()
    .optional()
    .describe(
      "Comma-separated TMDB genre IDs to exclude from results. Same IDs as with_genres.",
    ),
  first_air_date_year: z
    .number()
    .optional()
    .describe("Filter to TV shows that first aired in this specific year."),
  "first_air_date.gte": z
    .string()
    .optional()
    .describe(
      "Minimum first air date (inclusive), format YYYY-MM-DD. " +
        'Example: "2020-01-01" for shows from 2020 onwards.',
    ),
  "first_air_date.lte": z
    .string()
    .optional()
    .describe(
      "Maximum first air date (inclusive), format YYYY-MM-DD. " +
        'Example: "2024-12-31" for shows up to end of 2024.',
    ),
  "vote_average.gte": z
    .number()
    .optional()
    .describe(
      "Minimum average vote score (0-10). " +
        'Example: 7 for "well-rated" shows, 8 for "highly rated".',
    ),
  "vote_average.lte": z
    .number()
    .optional()
    .describe("Maximum average vote score (0-10)."),
  with_original_language: z
    .string()
    .optional()
    .describe(
      'ISO 639-1 language code for original language. Examples: "en" (English), ' +
        '"ko" (Korean), "ja" (Japanese), "fr" (French), "es" (Spanish), ' +
        '"zh" (Chinese), "hi" (Hindi), "de" (German), "it" (Italian).',
    ),
  with_keywords: z
    .string()
    .optional()
    .describe(
      "Comma-separated TMDB keyword IDs to filter by. " +
        "Use this for thematic filtering when genre alone is insufficient.",
    ),
  "with_runtime.gte": z
    .number()
    .optional()
    .describe("Minimum episode runtime in minutes."),
  "with_runtime.lte": z
    .number()
    .optional()
    .describe("Maximum episode runtime in minutes."),
  with_networks: z
    .number()
    .optional()
    .describe(
      "TMDB network ID to filter by broadcasting network. " +
        "Examples: 213=Netflix, 1024=Amazon, 2739=Disney+, 49=HBO, 2552=Apple TV+.",
    ),
  with_status: z
    .string()
    .optional()
    .describe(
      "Filter by show status. Values: 0=Returning Series, 1=Planned, " +
        "2=In Production, 3=Ended, 4=Cancelled, 5=Pilot. " +
        "Can be comma-separated for multiple statuses.",
    ),
  with_type: z
    .string()
    .optional()
    .describe(
      "Filter by show type. Values: 0=Documentary, 1=News, 2=Miniseries, " +
        "3=Reality, 4=Scripted, 5=Talk Show, 6=Video. " +
        "Can be comma-separated for multiple types.",
    ),
});

const TOOL_DESCRIPTION =
  "Discover TV shows from the TMDB database using structured filters. " +
  "Use this tool for precise database queries like finding top-rated dramas, " +
  "shows from a specific year or country, or browsing by popularity. " +
  "This is different from semantic search — it filters by exact metadata " +
  "(genre, year, rating, language, network) rather than by thematic similarity. " +
  "Best for: 'popular Korean dramas', 'highest rated sci-fi shows from 2023', " +
  "'Netflix original comedies', 'Japanese anime sorted by rating'.";

export function createDiscoverTvShowsTool(locale: SupportedLocale) {
  return tool({
    description: TOOL_DESCRIPTION,
    inputSchema: discoverTvShowsInputSchema,
    execute: async (params) => discoverTvShows({ ...params, language: locale }),
  });
}
