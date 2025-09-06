import "server-only";
import { zodResponsesFunction } from "openai/helpers/zod";
import { operationsSchema } from "@/_generated/tmdb-zod";
import type { paths } from "@/_generated/tmdbV3";
import { discoverMovies } from "@/utils/tmdb-server-functions";

// Extract Zod schema from generated schemas and make it required
const movieDiscoverySchema = operationsSchema.shape[
  "discover-movie"
].shape.parameters.shape.query
  .unwrap()
  .unwrap();

// Type definition for tool parameters (using existing generated types)
type MovieDiscoveryParams = NonNullable<
  paths["/3/discover/movie"]["get"]["parameters"]["query"]
>;

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

  const args = JSON.parse(toolCall.arguments) as Record<string, unknown>;

  // Parse and validate with Zod schema
  const validatedParams = movieDiscoverySchema.parse(args);
  const movieResults = await discoverMovies(
    validatedParams as MovieDiscoveryParams,
  );

  return {
    call_id: toolCall.call_id,
    result: movieResults,
  };
}
