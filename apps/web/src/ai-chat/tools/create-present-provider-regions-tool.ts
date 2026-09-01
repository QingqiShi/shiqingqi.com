import { tool } from "ai";
import { z } from "zod";

export const presentProviderRegionsInputSchema = z.object({
  id: z.number().describe("The TMDB ID of the movie or TV show."),
  media_type: z.enum(["movie", "tv"]).describe('Either "movie" or "tv".'),
  provider_name: z
    .string()
    .describe('The provider name to display regions for (e.g. "Netflix").'),
});

const TOOL_DESCRIPTION =
  "Display which regions carry a specific provider as a visual card. " +
  "Call this after watch_providers returns a provider search result. " +
  "The card shows the provider logo, region count, and country list.";

export function createPresentProviderRegionsTool() {
  return tool({
    description: TOOL_DESCRIPTION,
    inputSchema: presentProviderRegionsInputSchema,
    execute: (input) => Promise.resolve(input),
  });
}
