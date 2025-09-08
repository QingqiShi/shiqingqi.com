import "server-only";
import { zodResponsesFunction } from "openai/helpers/zod";
import { searchTvShows } from "@/_generated/tmdb-server-functions";
import { operationsSchema } from "@/_generated/tmdb-zod";
import type { paths } from "@/_generated/tmdbV3";

// Extract Zod schema from generated schemas
const tvSearchSchema =
  operationsSchema.shape["search-tv"].shape.parameters.shape.query;

// Type definition for tool parameters (using existing generated types)
type TvSearchParams = NonNullable<
  paths["/3/search/tv"]["get"]["parameters"]["query"]
>;

// OpenAI Function Tool Definition using zodResponsesFunction helper
export const searchTvShowsByTitleTool = zodResponsesFunction({
  name: "search_tv_shows_by_title",
  description:
    "Search for TV shows by their original, translated and also known as names. Use this when users ask for a specific TV show name or want to find shows with particular titles.",
  parameters: tvSearchSchema,
});

// Tool execution function - maps tool call to actual TMDB API function
export async function executeTvSearchToolCall(toolCall: {
  name: string;
  arguments: string;
  call_id: string;
}): Promise<{ call_id: string; result: unknown }> {
  if (toolCall.name !== "search_tv_shows_by_title") {
    throw new Error(`Unknown tool: ${toolCall.name}`);
  }

  const args = JSON.parse(toolCall.arguments) as Record<string, unknown>;

  // Parse and validate with Zod schema
  const validatedParams = tvSearchSchema.parse(args);

  // Remove undefined values to avoid issues with the API
  const strippedParams = { ...validatedParams };
  Object.keys(strippedParams).forEach((key) => {
    if (!strippedParams[key as keyof TvSearchParams]) {
      delete strippedParams[key as keyof TvSearchParams];
    }
  });

  const tvResults = await searchTvShows(strippedParams as TvSearchParams);

  return {
    call_id: toolCall.call_id,
    result: tvResults,
  };
}
