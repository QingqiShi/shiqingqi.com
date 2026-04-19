import { tool } from "ai";
import { z } from "zod";

export const MOOD_VALUES = [
  "warm",
  "cool",
  "tense",
  "epic",
  "playful",
  "neutral",
] as const;

export const classifyMoodInputSchema = z.object({
  mood: z
    .enum(MOOD_VALUES)
    .describe(
      "Vibe of the response: warm (heartfelt, romance, feel-good), " +
        "cool (noir, contemplative, indie), tense (thriller, horror, suspense), " +
        "epic (action, sci-fi, sweeping blockbusters), playful (comedy, " +
        "light-hearted), neutral (general conversation or no dominant tone).",
    ),
});

export type ClassifyMoodInput = z.infer<typeof classifyMoodInputSchema>;

const TOOL_DESCRIPTION =
  "Set the emotional tone of the response. Call this as the FIRST action " +
  "of every reply so the UI can shift its background palette to match the " +
  "vibe of what you are about to say.";

export function createClassifyMoodTool() {
  return tool({
    description: TOOL_DESCRIPTION,
    inputSchema: classifyMoodInputSchema,
    execute: (input) => Promise.resolve(input),
  });
}
