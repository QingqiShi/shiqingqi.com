import { z } from "zod";
import { MOOD_VALUES } from "#src/movie-database/chat/tools/classify-mood-tool.ts";

export const chatMessageMetadataSchema = z.object({
  inputTokens: z.number().optional(),
  sessionId: z.string().optional(),
  mood: z.enum(MOOD_VALUES).optional(),
});
