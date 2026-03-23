import { tool } from "ai";
import { z } from "zod";
import { searchMulti } from "#src/_generated/tmdb-server-functions.ts";
import type { SupportedLocale } from "#src/types.ts";
import type { ResponseType } from "#src/utils/tmdb-client.ts";

type MultiSearchResult = NonNullable<
  ResponseType<"/3/search/multi", "get">["results"]
>[number];

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
  "Use this tool when the user mentions a specific movie, TV show, or person by name, " +
  "or wants to look up a particular title or actor/director. " +
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
    // Shared fields
    overview: result.overview,
    vote_average: result.vote_average,
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
      const response = await searchMulti({ query, language: locale });
      return response.results?.slice(0, MAX_RESULTS).map(mapResult) ?? [];
    },
  });
}
