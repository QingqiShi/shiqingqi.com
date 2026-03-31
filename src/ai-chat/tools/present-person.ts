import { tool } from "ai";
import { z } from "zod";

export const presentPersonInputSchema = z.object({
  people: z
    .array(
      z.object({
        id: z.number().describe("The TMDB person ID."),
      }),
    )
    .describe("List of people to display as profile cards."),
});

const TOOL_DESCRIPTION =
  "Display people (actors, directors, etc.) as visual profile cards in the conversation. " +
  "Pass person IDs from search results to present them visually. " +
  "Each card shows the profile photo, name, and known-for department.";

export function createPresentPersonTool() {
  return tool({
    description: TOOL_DESCRIPTION,
    inputSchema: presentPersonInputSchema,
    execute: (input) => Promise.resolve(input),
  });
}
