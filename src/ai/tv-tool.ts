import "server-only";
import { zodResponsesFunction } from "openai/helpers/zod";
import { discoverTvShows } from "@/_generated/tmdb-server-functions";
import { operationsSchema } from "@/_generated/tmdb-zod";
import type { paths } from "@/_generated/tmdbV3";
// Extract Zod schema from generated schemas
const tvDiscoverySchema = operationsSchema.shape[
  "discover-tv"
].shape.parameters.shape.query
  .unwrap()
  .unwrap();

// Type definition for tool parameters (using existing generated types)
type TvDiscoveryParams = NonNullable<
  paths["/3/discover/tv"]["get"]["parameters"]["query"]
>;

// OpenAI Function Tool Definition using zodResponsesFunction helper
export const tvDiscoveryTool = zodResponsesFunction({
  name: "discover_tv_shows",
  description:
    "Find TV shows using over 30 filters and sort options. Use this when users ask about finding TV shows, series recommendations, or want to explore TV shows by specific criteria.",
  parameters: tvDiscoverySchema,
});

// Tool execution function - maps tool call to actual TMDB API function
export async function executeTvToolCall(toolCall: {
  name: string;
  arguments: string;
  call_id: string;
}): Promise<{ call_id: string; result: unknown }> {
  if (toolCall.name !== "discover_tv_shows") {
    throw new Error(`Unknown tool: ${toolCall.name}`);
  }

  const args = JSON.parse(toolCall.arguments) as Record<string, unknown>;

  // Parse and validate with Zod schema
  const validatedParams = tvDiscoverySchema.parse(args);

  // Remove undefined values to avoid issues with the API
  const strippedParams = { ...validatedParams };
  Object.keys(strippedParams).forEach((key) => {
    if (!strippedParams[key as keyof TvDiscoveryParams]) {
      delete strippedParams[key as keyof TvDiscoveryParams];
    }
  });

  // Convert null values to undefined for TMDB API compatibility
  const sanitizedParams = Object.fromEntries(
    Object.entries(strippedParams).map(([key, value]) => [
      key,
      value === null ? undefined : value,
    ]),
  );

  const tvResults = await discoverTvShows({
    "vote_count.gte": 300,
    "vote_average.gte": 3,
    ...sanitizedParams,
  } as TvDiscoveryParams);

  return {
    call_id: toolCall.call_id,
    result: tvResults,
  };
}
