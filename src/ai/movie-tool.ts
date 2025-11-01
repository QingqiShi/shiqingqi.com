import "server-only";
import { zodResponsesFunction } from "openai/helpers/zod";
import { discoverMovies } from "#src/_generated/tmdb-server-functions.ts";
import { operationsSchema } from "#src/_generated/tmdb-zod.ts";
import type { paths } from "#src/_generated/tmdbV3.d.ts";

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

  // Remove undefined values to avoid issues with the API
  const strippedParams = { ...validatedParams };
  Object.keys(strippedParams).forEach((key) => {
    if (!strippedParams[key as keyof MovieDiscoveryParams]) {
      delete strippedParams[key as keyof MovieDiscoveryParams];
    }
  });

  // Convert null values to undefined for TMDB API compatibility
  const sanitizedParams = Object.fromEntries(
    Object.entries(strippedParams).map(([key, value]) => [
      key,
      value === null ? undefined : value,
    ]),
  );

  const movieResults = await discoverMovies({
    "vote_count.gte": 300,
    "vote_average.gte": 3,
    ...sanitizedParams,
  } as MovieDiscoveryParams);

  return {
    call_id: toolCall.call_id,
    result: movieResults,
  };
}
