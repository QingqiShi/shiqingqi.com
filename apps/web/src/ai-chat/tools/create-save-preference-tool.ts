import { tool } from "ai";
import { z } from "zod";

export const savePreferenceInputSchema = z.object({
  preferences: z
    .array(
      z.object({
        category: z
          .enum([
            "genre",
            "actor",
            "director",
            "content_rating",
            "language",
            "keyword",
          ])
          .describe("The type of preference being saved."),
        value: z
          .string()
          .describe(
            "The preference value, e.g. a genre name, actor name, or keyword.",
          ),
        sentiment: z
          .enum(["like", "dislike"])
          .describe("Whether the user likes or dislikes this."),
      }),
    )
    .describe("List of user preferences detected from the conversation."),
});

export type SavePreferenceInput = z.infer<typeof savePreferenceInputSchema>;

const TOOL_DESCRIPTION =
  "Save user preferences detected during conversation. " +
  "Call this when the user expresses likes or dislikes about genres, actors, " +
  "directors, content ratings, languages, or themes/keywords. " +
  "Preferences are stored client-side for future personalisation.";

export function createSavePreferenceTool() {
  return tool({
    description: TOOL_DESCRIPTION,
    inputSchema: savePreferenceInputSchema,
    execute: (input) => Promise.resolve(input),
  });
}
