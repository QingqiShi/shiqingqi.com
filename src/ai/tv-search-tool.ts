import "server-only";
import { zodResponsesFunction } from "openai/helpers/zod";
import { searchTvShows } from "#src/_generated/tmdb-server-functions.ts";
import { operationsSchema } from "#src/_generated/tmdb-zod.ts";
import { sanitizeParams } from "./sanitize-params";

// Extract Zod schema from generated schemas
const tvSearchSchema =
  operationsSchema.shape["search-tv"].shape.parameters.shape.query;

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

  const validatedParams = tvSearchSchema.parse(
    JSON.parse(toolCall.arguments || "{}"),
  );

  const tvResults = await searchTvShows(sanitizeParams(validatedParams));

  return {
    call_id: toolCall.call_id,
    result: tvResults,
  };
}
