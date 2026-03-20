import { generateText } from "ai";
import "server-only";
import { z } from "zod";
import { getAnthropicModel } from "./client";
import { getChatSystemInstructions } from "./system-instructions";

export const chatInputSchema = z.object({
  message: z.string().min(1).max(2000),
  locale: z.enum(["en", "zh"]).default("en"),
});

export type ChatInput = z.infer<typeof chatInputSchema>;

export async function chat({ message, locale }: ChatInput) {
  const system = getChatSystemInstructions(locale);

  const result = await generateText({
    model: getAnthropicModel(),
    system,
    messages: [{ role: "user", content: message }],
  });

  return { text: result.text };
}
