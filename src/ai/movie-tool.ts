import "server-only";
import { zodResponsesFunction } from "openai/helpers/zod";
import { discoverMovies } from "#src/_generated/tmdb-server-functions.ts";
import { operationsSchema } from "#src/_generated/tmdb-zod.ts";
import { sanitizeParams } from "./sanitize-params";

// Extract Zod schema from generated schemas and make it required
const movieDiscoverySchema = operationsSchema.shape[
  "discover-movie"
].shape.parameters.shape.query
  .unwrap()
  .unwrap();

// OpenAI Function Tool Definition using zodResponsesFunction helper
export const movieDiscoveryTool = zodResponsesFunction({
  name: "discover_movies",
  description:
    "Find movies using over 30 filters and sort options. Use this when users ask about finding movies, movie recommendations, or want to explore movies by specific criteria.",
  parameters: movieDiscoverySchema,
});

// Tool execution function - maps tool call to actual TMDB API function
export async function executeMovieToolCall(toolCall: {
  name: string;
  arguments: string;
  call_id: string;
}): Promise<{ call_id: string; result: unknown }> {
  if (toolCall.name !== "discover_movies") {
    throw new Error(`Unknown tool: ${toolCall.name}`);
  }

  const validatedParams = movieDiscoverySchema.parse(
    JSON.parse(toolCall.arguments || "{}"),
  );

  const movieResults = await discoverMovies({
    "vote_count.gte": 300,
    "vote_average.gte": 3,
    ...sanitizeParams(validatedParams),
  });

  return {
    call_id: toolCall.call_id,
    result: movieResults,
  };
}
