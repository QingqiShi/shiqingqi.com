import type { SupportedLocale } from "@tuja/i18n/types";
import type { UIMessage } from "ai";
import type { MOOD_VALUES } from "#src/movie-database/chat/tools/classify-mood-tool.ts";

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
