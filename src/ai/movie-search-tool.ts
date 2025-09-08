import "server-only";
import { zodResponsesFunction } from "openai/helpers/zod";
import { searchMovies } from "@/_generated/tmdb-server-functions";
import { operationsSchema } from "@/_generated/tmdb-zod";
import type { paths } from "@/_generated/tmdbV3";

// Extract Zod schema from generated schemas (backward compatible)
const movieSearchSchema =
  operationsSchema.shape["search-movie"].shape.parameters.shape.query;

// Type definition for tool parameters (using existing generated types)
type MovieSearchParams = NonNullable<
  paths["/3/search/movie"]["get"]["parameters"]["query"]
>;

// OpenAI Function Tool Definition using zodResponsesFunction helper
export const searchMoviesByTitleTool = zodResponsesFunction({
  name: "search_movies_by_title",
  description:
    "Search for movies by their original, translated and alternative titles. Use this when users ask for a specific movie name or want to find movies with particular titles.",
  parameters: movieSearchSchema,
});

// Tool execution function - maps tool call to actual TMDB API function
export async function executeMovieSearchToolCall(toolCall: {
  name: string;
  arguments: string;
  call_id: string;
}): Promise<{ call_id: string; result: unknown }> {
  if (toolCall.name !== "search_movies_by_title") {
    throw new Error(`Unknown tool: ${toolCall.name}`);
  }

  const args = JSON.parse(toolCall.arguments) as Record<string, unknown>;

  // Parse and validate with Zod schema
  const validatedParams = movieSearchSchema.parse(args);

  // Remove undefined values to avoid issues with the API
  const strippedParams = { ...validatedParams };
  Object.keys(strippedParams).forEach((key) => {
    if (!strippedParams[key as keyof MovieSearchParams]) {
      delete strippedParams[key as keyof MovieSearchParams];
    }
  });

  const movieResults = await searchMovies(strippedParams as MovieSearchParams);

  return {
    call_id: toolCall.call_id,
    result: movieResults,
  };
}
