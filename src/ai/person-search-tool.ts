import "server-only";
import { zodResponsesFunction } from "openai/helpers/zod";
import { searchPerson } from "@/_generated/tmdb-server-functions";
import { operationsSchema } from "@/_generated/tmdb-zod";
import type { paths } from "@/_generated/tmdbV3";

// Extract Zod schema from generated schemas
const personSearchSchema =
  operationsSchema.shape["search-person"].shape.parameters.shape.query;

// Type definition for tool parameters (using existing generated types)
type PersonSearchParams = NonNullable<
  paths["/3/search/person"]["get"]["parameters"]["query"]
>;

// OpenAI Function Tool Definition using zodResponsesFunction helper
export const searchPersonByNameTool = zodResponsesFunction({
  name: "search_person_by_name",
  description:
    "Search for people by their name and also known as names. Use this to find actor, director, or crew member IDs for use in discover functions with with_cast, with_people, or with_crew parameters.",
  parameters: personSearchSchema,
});

// Tool execution function - maps tool call to actual TMDB API function
export async function executePersonSearchToolCall(toolCall: {
  name: string;
  arguments: string;
  call_id: string;
}): Promise<{ call_id: string; result: unknown }> {
  if (toolCall.name !== "search_person_by_name") {
    throw new Error(`Unknown tool: ${toolCall.name}`);
  }

  const args = JSON.parse(toolCall.arguments) as Record<string, unknown>;

  // Parse and validate with Zod schema
  const validatedParams = personSearchSchema.parse(args);

  // Remove undefined values to avoid issues with the API
  const strippedParams = { ...validatedParams };
  Object.keys(strippedParams).forEach((key) => {
    if (!strippedParams[key as keyof PersonSearchParams]) {
      delete strippedParams[key as keyof PersonSearchParams];
    }
  });

  const personResults = await searchPerson(
    strippedParams as PersonSearchParams,
  );

  return {
    call_id: toolCall.call_id,
    result: personResults,
  };
}
