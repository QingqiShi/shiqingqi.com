import { tool } from "ai";
import { z } from "zod";
import type { SupportedLocale } from "#src/types.ts";
import { searchSimilar } from "#src/vector-db/search.ts";
import { vectorSearchFiltersSchema } from "#src/vector-db/types.ts";
import { toolError } from "./tool-error";

export const semanticSearchInputSchema = z.object({
  query: z
    .string()
    .describe(
      "Natural language search query describing what the user is looking for. " +
        "Focus on themes, mood, plot elements, or style rather than exact titles. " +
        'Examples: "mind-bending sci-fi with time loops", "heartwarming family drama set in Italy", ' +
        '"dark crime thriller with unreliable narrator".',
    ),
  filters: vectorSearchFiltersSchema
    .optional()
    .describe(
      "Optional metadata filters to narrow results. Available filters: " +
        'mediaType ("movie" or "tv"), ' +
        "genreIds (TMDB genre IDs: 28=Action, 12=Adventure, 16=Animation, 35=Comedy, " +
        "80=Crime, 99=Documentary, 18=Drama, 10751=Family, 14=Fantasy, 36=History, " +
        "27=Horror, 10402=Music, 9648=Mystery, 10749=Romance, 878=Science Fiction, " +
        "10770=TV Movie, 53=Thriller, 10752=War, 37=Western), " +
        "releaseYearMin/releaseYearMax (integer years), " +
        "voteAverageMin (0-10 rating threshold), " +
        'originalLanguage (ISO 639-1 code, e.g. "en", "ko", "ja").',
    ),
  topK: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe(
      "Number of results to return (1-50). Default 10. Use fewer for focused recommendations, more for broad discovery.",
    ),
});

const TOOL_DESCRIPTION =
  "Search for movies and TV shows by semantic similarity. " +
  "Use this tool when the user asks for recommendations based on mood, themes, plot descriptions, " +
  "or wants to find content similar to something they describe. " +
  "The search understands natural language and finds semantically related content — " +
  "it does NOT search by exact title. " +
  "Craft your query to capture the essence of what the user wants " +
  "(e.g. themes, atmosphere, genre blend, emotional tone). " +
  "Use filters to narrow by type, genre, year range, rating, or language when the user specifies preferences.";

export function createSemanticSearchTool(locale: SupportedLocale) {
  return tool({
    description: TOOL_DESCRIPTION,
    inputSchema: semanticSearchInputSchema,
    execute: async ({ query, filters, topK }) => {
      try {
        return await searchSimilar(query, locale, { filters, topK });
      } catch (error) {
        console.error("semantic_search failed", error);
        return toolError(
          "vector_search_unavailable",
          "Semantic search is temporarily unavailable. Tell the user and suggest falling back to tmdb_search with specific titles.",
        );
      }
    },
  });
}
