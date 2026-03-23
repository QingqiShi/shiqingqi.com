import { tool } from "ai";
import { z } from "zod";
import { discoverMovies } from "#src/_generated/tmdb-server-functions.ts";
import type { SupportedLocale } from "#src/types.ts";

export const discoverMoviesInputSchema = z.object({
  sort_by: z
    .union([
      z.literal("popularity.asc"),
      z.literal("popularity.desc"),
      z.literal("revenue.asc"),
      z.literal("revenue.desc"),
      z.literal("primary_release_date.asc"),
      z.literal("primary_release_date.desc"),
      z.literal("vote_average.asc"),
      z.literal("vote_average.desc"),
      z.literal("vote_count.asc"),
      z.literal("vote_count.desc"),
    ])
    .optional()
    .describe(
      'Sort order for results. Default is "popularity.desc". ' +
        "Common choices: popularity.desc (trending), vote_average.desc (highest rated), " +
        "primary_release_date.desc (newest), revenue.desc (highest grossing).",
    ),
  with_genres: z
    .string()
    .optional()
    .describe(
      "Comma-separated TMDB genre IDs to include. " +
        "Movie genre IDs: 28=Action, 12=Adventure, 16=Animation, 35=Comedy, " +
        "80=Crime, 99=Documentary, 18=Drama, 10751=Family, 14=Fantasy, 36=History, " +
        "27=Horror, 10402=Music, 9648=Mystery, 10749=Romance, 878=Science Fiction, " +
        '53=Thriller, 10752=War, 37=Western. Example: "28,878" for Action Sci-Fi.',
    ),
  without_genres: z
    .string()
    .optional()
    .describe(
      "Comma-separated TMDB genre IDs to exclude from results. Same IDs as with_genres.",
    ),
  primary_release_year: z
    .number()
    .optional()
    .describe("Filter to movies released in this specific year."),
  "primary_release_date.gte": z
    .string()
    .optional()
    .describe(
      "Minimum release date (inclusive), format YYYY-MM-DD. " +
        'Example: "2020-01-01" for movies from 2020 onwards.',
    ),
  "primary_release_date.lte": z
    .string()
    .optional()
    .describe(
      "Maximum release date (inclusive), format YYYY-MM-DD. " +
        'Example: "2024-12-31" for movies up to end of 2024.',
    ),
  "vote_average.gte": z
    .number()
    .optional()
    .describe(
      "Minimum average vote score (0-10). " +
        'Example: 7 for "well-rated" movies, 8 for "highly rated".',
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
    .describe("Minimum runtime in minutes."),
  "with_runtime.lte": z
    .number()
    .optional()
    .describe("Maximum runtime in minutes."),
  year: z
    .number()
    .optional()
    .describe(
      "Filter by year (searches both release and theatrical dates). " +
        "Prefer primary_release_year for precision.",
    ),
  with_cast: z
    .string()
    .optional()
    .describe(
      "Comma-separated TMDB person IDs to filter by cast members. " +
        "Use when the user asks for movies featuring specific actors.",
    ),
  with_crew: z
    .string()
    .optional()
    .describe(
      "Comma-separated TMDB person IDs to filter by crew members. " +
        "Use when the user asks for movies by specific directors or writers.",
    ),
});

const TOOL_DESCRIPTION =
  "Discover movies from the TMDB database using structured filters. " +
  "Use this tool for precise database queries like finding top-rated movies in a genre, " +
  "movies from a specific year or country, or browsing by popularity. " +
  "This is different from semantic search — it filters by exact metadata " +
  "(genre, year, rating, language) rather than by thematic similarity. " +
  "Best for: 'top rated horror movies from 2024', 'popular Korean films', " +
  "'highest grossing action movies', 'comedies rated above 8'.";

export function createDiscoverMoviesTool(locale: SupportedLocale) {
  return tool({
    description: TOOL_DESCRIPTION,
    inputSchema: discoverMoviesInputSchema,
    execute: async (params) => discoverMovies({ ...params, language: locale }),
  });
}
