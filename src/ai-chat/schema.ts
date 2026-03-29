import type { UIMessage } from "ai";
import { z } from "zod";
import { isUIMessage } from "./is-ui-message";

export const chatInputSchema = z.object({
  messages: z.array(z.custom<UIMessage>(isUIMessage)).min(1),
  locale: z.enum(["en", "zh"]).default("en"),
});

export type ChatInput = z.infer<typeof chatInputSchema>;
