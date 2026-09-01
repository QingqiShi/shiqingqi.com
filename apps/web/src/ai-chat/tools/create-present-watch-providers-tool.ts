import { tool } from "ai";
import { z } from "zod";

export const presentWatchProvidersInputSchema = z.object({
  id: z.number().describe("The TMDB ID of the movie or TV show."),
  media_type: z.enum(["movie", "tv"]).describe('Either "movie" or "tv".'),
  region: z
    .string()
    .length(2)
    .describe("ISO 3166-1 country code (2 letters, e.g. US, GB)."),
});

const TOOL_DESCRIPTION =
  "Display watch provider availability as a visual card in the conversation. " +
  "Call this after watch_providers returns providers for a specific region. " +
  "The card shows streaming, rental, and purchase options with provider logos.";

export function createPresentWatchProvidersTool() {
  return tool({
    description: TOOL_DESCRIPTION,
    inputSchema: presentWatchProvidersInputSchema,
    execute: (input) => Promise.resolve(input),
  });
}
