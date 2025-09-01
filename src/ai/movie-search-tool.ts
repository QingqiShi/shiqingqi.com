import "server-only";
import { zodResponsesFunction } from "openai/helpers/zod";
import { operationsSchema } from "@/_generated/tmdb-zod";
import type { paths } from "@/_generated/tmdbV3";
import { searchMoviesByTitle } from "@/utils/tmdb-api";

// Extract Zod schema from generated schemas
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
    "Search for specific movies by their title, original title, or alternative titles. Use this when users ask for a specific movie name or want to find movies with particular titles.",
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
  const movieResults = await searchMoviesByTitle(
    validatedParams as MovieSearchParams,
  );

  return {
    call_id: toolCall.call_id,
    result: movieResults,
  };
}
