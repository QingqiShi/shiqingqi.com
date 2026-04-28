import type { UIMessage } from "ai";
import { z } from "zod";
import { MOOD_VALUES } from "./tools/classify-mood";

export type ChatMood = (typeof MOOD_VALUES)[number];

export interface ChatMessageMetadata {
  inputTokens?: number;
  sessionId?: string;
  mood?: ChatMood;
}

export const chatMessageMetadataSchema = z.object({
  inputTokens: z.number().optional(),
  sessionId: z.string().optional(),
  mood: z.enum(MOOD_VALUES).optional(),
});

export function findLatestMoodFromMessages(
  messages: ReadonlyArray<UIMessage<ChatMessageMetadata>>,
): ChatMood | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "assistant") continue;
    if (message.metadata?.mood) {
      return message.metadata.mood;
    }
  }
  return undefined;
}
