import type { SupportedLocale } from "@tuja/i18n/types";
import { tool } from "ai";
import { z } from "zod";
import { searchMulti } from "#src/_generated/tmdb-server-functions.ts";
import type { ResponseType } from "#src/movie-database/tmdb/tmdb-get.ts";
import {
  MAX_MEDIA_RESULTS,
  toCompactMediaResult,
} from "./to-compact-media-results";
import { toolError } from "./tool-error";

// The TMDB OpenAPI spec flattens the multi-search union type, omitting fields
// that only appear for specific media_type values. The API returns these fields
// at runtime (verified against the live API on 2026-03-28).
type MultiSearchResult = NonNullable<
  ResponseType<"/3/search/multi", "get">["results"]
>[number] & {
  first_air_date?: string;
  profile_path?: string;
  known_for_department?: string;
};

const tmdbSearchInputSchema = z.object({
  query: z
    .string()
    .describe(
      "The title or person name to search for, and nothing else: " +
        'extra words such as a year, "movie", or an actor\'s name make TMDB miss the match. ' +
        "Searches across movies, TV shows, and people. " +
        'Examples: "Inception", "Breaking Bad", "Christopher Nolan".',
    ),
});

const TOOL_DESCRIPTION =
  "Search TMDB for movies, TV shows, and people by name. " +
  "Use it when the user names a title or person, and to turn titles you picked yourself into TMDB IDs for present_media. " +
  "It matches names, not descriptions, so search one title per call. " +
  "To resolve several picks, make the calls in parallel in one step. " +
  "Titles that tmdb_discover or tmdb_recommendations returned already have IDs, so they need no search. " +
  "Results include a media_type field (movie, tv, or person), " +
  "and release or first-air dates help you pick the right title when several share a name.";

function mapResult(result: MultiSearchResult) {
  return {
    ...toCompactMediaResult(result, result.media_type),
    popularity: result.popularity,
    profile_path: result.profile_path,
    known_for_department: result.known_for_department,
  };
}

const TRAILING_YEAR = /^(.+?)\s+\(?(?:19|20)\d{2}\)?$/;

export function createTmdbSearchTool(locale: SupportedLocale) {
  async function search(query: string) {
    const response = await searchMulti({ query, language: locale });
    return response.results ?? [];
  }

  return tool({
    description: TOOL_DESCRIPTION,
    inputSchema: tmdbSearchInputSchema,
    execute: async ({ query }) => {
      try {
        let results = await search(query);

        // Models often add the year to the title, and TMDB then finds nothing.
        const yearMatch = TRAILING_YEAR.exec(query.trim());
        if (results.length === 0 && yearMatch) {
          results = await search(yearMatch[1]);
        }

        if (results.length === 0) {
          return toolError(
            "no_match",
            `No title or person on TMDB matches "${query}". The query must be only a title or a name. If this was one of your picks, drop it rather than search again with other words.`,
          );
        }

        return results.slice(0, MAX_MEDIA_RESULTS).map(mapResult);
      } catch (error) {
        console.error("tmdb_search failed", error);
        return toolError(
          "tmdb_unavailable",
          "TMDB search is temporarily unavailable. Tell the user and offer to try a different query.",
        );
      }
    },
  });
}
