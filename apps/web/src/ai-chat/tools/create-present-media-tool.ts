import { tool } from "ai";
import { z } from "zod";

export const presentMediaInputSchema = z.object({
  media: z
    .array(
      z.object({
        id: z.number().describe("The TMDB ID of the movie or TV show."),
        media_type: z.enum(["movie", "tv"]).describe('Either "movie" or "tv".'),
      }),
    )
    .describe(
      "Ordered list of media items to display. " +
        "The order controls the visual display order.",
    ),
});

const TOOL_DESCRIPTION =
  "Display movies and TV shows as visual media cards in the conversation. " +
  "Pass items from search results you want to present, in your preferred order. " +
  "Each card shows the poster, rating, and links to the detail page.";

export function createPresentMediaTool() {
  return tool({
    description: TOOL_DESCRIPTION,
    inputSchema: presentMediaInputSchema,
    execute: (input) => Promise.resolve(input),
  });
}
