import type { UIMessage } from "ai";
import type { SupportedLocale } from "#src/types.ts";

export interface ChatInput {
  messages: UIMessage[];
  locale: SupportedLocale;
  countryCode?: string;
}
