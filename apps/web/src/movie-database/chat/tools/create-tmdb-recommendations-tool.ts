import type { SupportedLocale } from "@tuja/i18n/types";
import { tool } from "ai";
import { z } from "zod";
import {
  getMovieRecommendations,
  getTvShowRecommendations,
} from "#src/_generated/tmdb-server-functions.ts";
import { toCompactMediaResults } from "./to-compact-media-results";
import { toolError } from "./tool-error";

export const tmdbRecommendationsInputSchema = z.object({
  id: z.number().describe("The TMDB ID of the movie or TV show."),
  media_type: z.enum(["movie", "tv"]).describe('Either "movie" or "tv".'),
});

const TOOL_DESCRIPTION =
  "Get titles that TMDB recommends to viewers of a given movie or TV show. " +
  'Use this for "something like X" requests once you know the TMDB ID of X ' +
  "(from tmdb_search, or from an [About: …] prefix). " +
  "Results are the same media type as the input and use the same shape as tmdb_search. " +
  "Treat them as candidates: keep the picks that really match what the user asked for, " +
  "and add titles from your own knowledge when the list is weak.";

export function createTmdbRecommendationsTool(locale: SupportedLocale) {
  return tool({
    description: TOOL_DESCRIPTION,
    inputSchema: tmdbRecommendationsInputSchema,
    execute: async ({ id, media_type }) => {
      try {
        const response =
          media_type === "movie"
            ? await getMovieRecommendations({
                movie_id: id.toString(),
                language: locale,
              })
            : await getTvShowRecommendations({
                series_id: id.toString(),
                language: locale,
              });
        return toCompactMediaResults(response.results ?? [], media_type);
      } catch (error) {
        console.error("tmdb_recommendations failed", error);
        return toolError(
          "tmdb_unavailable",
          "TMDB recommendations are temporarily unavailable. Recommend from your own knowledge and resolve the titles with tmdb_search.",
        );
      }
    },
  });
}
