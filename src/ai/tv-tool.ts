import "server-only";
import { zodResponsesFunction } from "openai/helpers/zod";
import { discoverTvShows } from "#src/_generated/tmdb-server-functions.ts";
import { operationsSchema } from "#src/_generated/tmdb-zod.ts";
import type { paths } from "#src/_generated/tmdbV3.d.ts";
import { sanitizeParams } from "./sanitize-params";
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

  const validatedParams = tvDiscoverySchema.parse(
    JSON.parse(toolCall.arguments || "{}"),
  );

  const tvResults = await discoverTvShows({
    "vote_count.gte": 300,
    "vote_average.gte": 3,
    ...sanitizeParams(validatedParams),
  } as TvDiscoveryParams);

  return {
    call_id: toolCall.call_id,
    result: tvResults,
  };
}
