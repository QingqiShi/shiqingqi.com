import "server-only";
import { zodResponsesFunction } from "openai/helpers/zod";
import { searchMovies } from "#src/_generated/tmdb-server-functions.ts";
import { operationsSchema } from "#src/_generated/tmdb-zod.ts";
import { sanitizeParams } from "./sanitize-params";

// Extract Zod schema from generated schemas (backward compatible)
const movieSearchSchema =
  operationsSchema.shape["search-movie"].shape.parameters.shape.query;

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

  const validatedParams = movieSearchSchema.parse(
    JSON.parse(toolCall.arguments || "{}"),
  );

  const movieResults = await searchMovies(sanitizeParams(validatedParams));

  return {
    call_id: toolCall.call_id,
    result: movieResults,
  };
}
