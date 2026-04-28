import { tool } from "ai";
import { z } from "zod";
import { searchMulti } from "#src/_generated/tmdb-server-functions.ts";
import type { SupportedLocale } from "#src/types.ts";
import type { ResponseType } from "#src/utils/tmdb-client.ts";
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

export const tmdbSearchInputSchema = z.object({
  query: z
    .string()
    .describe(
      "The title or person name to search for. " +
        "Searches across movies, TV shows, and people. " +
        'Examples: "Inception", "Breaking Bad", "Christopher Nolan".',
    ),
});

const TOOL_DESCRIPTION =
  "Search TMDB for movies, TV shows, and people by name. " +
  "Use this tool ONLY when the user mentions a specific movie, TV show, or person by name, " +
  "or wants to look up a particular title or actor/director. " +
  "Do NOT use this to verify or re-search titles already returned by semantic_search. " +
  "Results include a media_type field (movie, tv, or person) to distinguish result types. " +
  "For thematic or mood-based queries, use semantic_search instead.";

const MAX_RESULTS = 10;

function mapResult(result: MultiSearchResult) {
  return {
    id: result.id,
    media_type: result.media_type,
    // Movie fields
    title: result.title,
    release_date: result.release_date,
    // TV / Person fields
    name: result.name,
    first_air_date: result.first_air_date,
    // Person fields
    profile_path: result.profile_path,
    known_for_department: result.known_for_department,
    // Shared fields
    overview: result.overview,
    vote_average: result.vote_average,
    poster_path: result.poster_path,
    genre_ids: result.genre_ids,
    original_language: result.original_language,
    popularity: result.popularity,
  };
}

export function createTmdbSearchTool(locale: SupportedLocale) {
  return tool({
    description: TOOL_DESCRIPTION,
    inputSchema: tmdbSearchInputSchema,
    execute: async ({ query }) => {
      try {
        const response = await searchMulti({ query, language: locale });
        return response.results?.slice(0, MAX_RESULTS).map(mapResult) ?? [];
      } catch (error) {
        console.error("tmdb_search failed", error);
        return toolError(
          "tmdb_unavailable",
          "TMDB search is temporarily unavailable. Tell the user and offer an alternative such as semantic_search or a different query.",
        );
      }
    },
  });
}
