import { z } from "zod";
import { MOOD_VALUES } from "./tools/classify-mood-tool";

export const chatMessageMetadataSchema = z.object({
  inputTokens: z.number().optional(),
  sessionId: z.string().optional(),
  mood: z.enum(MOOD_VALUES).optional(),
});
