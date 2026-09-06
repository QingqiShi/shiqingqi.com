import type { UIMessage } from "ai";
import type { SupportedLocale } from "#src/types.ts";
import type { MOOD_VALUES } from "./tools/create-classify-mood-tool";

export type ChatMood = (typeof MOOD_VALUES)[number];

export interface ChatMessageMetadata {
  inputTokens?: number;
  sessionId?: string;
  mood?: ChatMood;
}

export interface ChatInput {
  messages: UIMessage[];
  locale: SupportedLocale;
  countryCode?: string;
}
