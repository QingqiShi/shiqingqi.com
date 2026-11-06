import type { SupportedLocale } from "@tuja/i18n/types";
import { tool } from "ai";
import { z } from "zod";
import {
  discoverMovies,
  discoverTvShows,
} from "#src/_generated/tmdb-server-functions.ts";
import type { QueryParams } from "#src/movie-database/tmdb/tmdb-get.ts";
import { toCompactMediaResults } from "./to-compact-media-results";
import { toolError } from "./tool-error";

export const tmdbDiscoverInputSchema = z.object({
  media_type: z.enum(["movie", "tv"]).describe('Either "movie" or "tv".'),
  genre_ids: z
    .array(z.number().int())
    .optional()
    .describe(
      "TMDB genre IDs that every result must have. Movie and TV genres differ. " +
        "Movie: 28=Action, 12=Adventure, 16=Animation, 35=Comedy, 80=Crime, " +
        "99=Documentary, 18=Drama, 10751=Family, 14=Fantasy, 36=History, " +
        "27=Horror, 10402=Music, 9648=Mystery, 10749=Romance, 878=Science Fiction, " +
        "53=Thriller, 10752=War, 37=Western. " +
        "TV: 10759=Action & Adventure, 16=Animation, 35=Comedy, 80=Crime, " +
        "99=Documentary, 18=Drama, 10751=Family, 10762=Kids, 9648=Mystery, " +
        "10764=Reality, 10765=Sci-Fi & Fantasy, 10768=War & Politics, 37=Western.",
    ),
  exclude_genre_ids: z
    .array(z.number().int())
    .optional()
    .describe(
      "TMDB genre IDs that no result may have, e.g. [27] for no horror.",
    ),
  year_from: z
    .number()
    .int()
    .optional()
    .describe("Earliest release (movie) or first-air (TV) year, inclusive."),
  year_to: z
    .number()
    .int()
    .optional()
    .describe(
      "Latest release or first-air year, inclusive. Without it, results stop at today, so unreleased titles are left out.",
    ),
  min_rating: z
    .number()
    .min(0)
    .max(10)
    .optional()
    .describe("Minimum TMDB rating (0-10), e.g. 7 for well-reviewed titles."),
  original_language: z
    .string()
    .length(2)
    .optional()
    .describe(
      'ISO 639-1 code of the original language, e.g. "ko", "ja", "fr".',
    ),
  sort_by: z
    .enum(["popularity", "rating"])
    .optional()
    .describe(
      'Default "popularity". Use "rating" for "best" or "highest rated" requests over settled years. ' +
        'For the last few years, "rating" favours little-known titles: use "popularity" with min_rating instead.',
    ),
});

type TmdbDiscoverInput = z.infer<typeof tmdbDiscoverInputSchema>;

const TOOL_DESCRIPTION =
  "Discover movies or TV shows on TMDB by filters: genre, release year range, " +
  "minimum rating, original language, and sort order. " +
  'Use this for filter-shaped requests such as "top-rated Korean thrillers from the 2010s" ' +
  'or "popular animated films from last year". ' +
  "It cannot match plot, mood, or themes — for those, pick titles yourself and resolve them with tmdb_search. " +
  "Results use the same shape as tmdb_search.";

// Few votes make a rating unreliable: a title with 3 votes can average 10/10.
// The floor is higher when the rating decides which titles come back.
const RATED_VOTE_COUNT_FLOOR = 200;
const POPULAR_VOTE_COUNT_FLOOR = 50;

type DiscoverParams = QueryParams<"/3/discover/movie", "get"> &
  QueryParams<"/3/discover/tv", "get">;

export function buildDiscoverParams(
  input: TmdbDiscoverInput,
  locale: SupportedLocale,
  today: string,
): DiscoverParams {
  const ratingMatters =
    input.sort_by === "rating" || input.min_rating !== undefined;
  const params: DiscoverParams = {
    language: locale,
    include_adult: false,
    sort_by:
      input.sort_by === "rating" ? "vote_average.desc" : "popularity.desc",
    "vote_count.gte": ratingMatters
      ? RATED_VOTE_COUNT_FLOOR
      : POPULAR_VOTE_COUNT_FLOOR,
  };

  if (input.min_rating !== undefined) {
    params["vote_average.gte"] = input.min_rating;
  }
  if (input.genre_ids?.length) {
    params.with_genres = input.genre_ids.join(",");
  }
  if (input.exclude_genre_ids?.length) {
    params.without_genres = input.exclude_genre_ids.join(",");
  }
  if (input.original_language) {
    params.with_original_language = input.original_language;
  }

  const dateKey =
    input.media_type === "movie" ? "primary_release_date" : "first_air_date";
  if (input.year_from !== undefined) {
    params[`${dateKey}.gte` as const] = `${String(input.year_from)}-01-01`;
  }
  const yearEnd = `${String(input.year_to)}-12-31`;
  params[`${dateKey}.lte` as const] =
    input.year_to !== undefined && yearEnd < today ? yearEnd : today;

  return params;
}

export function createTmdbDiscoverTool(locale: SupportedLocale) {
  return tool({
    description: TOOL_DESCRIPTION,
    inputSchema: tmdbDiscoverInputSchema,
    execute: async (input) => {
      const params = buildDiscoverParams(
        input,
        locale,
        new Date().toISOString().slice(0, 10),
      );
      try {
        const response =
          input.media_type === "movie"
            ? await discoverMovies(params)
            : await discoverTvShows(params);
        return toCompactMediaResults(response.results ?? [], input.media_type);
      } catch (error) {
        console.error("tmdb_discover failed", error);
        return toolError(
          "tmdb_unavailable",
          "TMDB discover is temporarily unavailable. Recommend from your own knowledge and resolve the titles with tmdb_search.",
        );
      }
    },
  });
}
