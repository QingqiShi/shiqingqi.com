import type { UIMessage } from "ai";
import { z } from "zod";

function isUIMessage(val: unknown): val is UIMessage {
  if (typeof val !== "object" || val === null) return false;
  return (
    "id" in val &&
    typeof val.id === "string" &&
    "role" in val &&
    typeof val.role === "string" &&
    "parts" in val &&
    Array.isArray(val.parts)
  );
}

export const chatInputSchema = z.object({
  messages: z.array(z.custom<UIMessage>(isUIMessage)).min(1),
  locale: z.enum(["en", "zh"]).default("en"),
});

export type ChatInput = z.infer<typeof chatInputSchema>;
