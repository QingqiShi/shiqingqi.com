import { generateText } from "ai";
import "server-only";
import { getAnthropicModel } from "./client";
import type { ChatInput } from "./schema";
import { getChatSystemInstructions } from "./system-instructions";

export { chatInputSchema, type ChatInput } from "./schema";

export async function chat({ message, locale }: ChatInput) {
  const system = getChatSystemInstructions(locale);

  const result = await generateText({
    model: getAnthropicModel(),
    system,
    messages: [{ role: "user", content: message }],
  });

  return { text: result.text };
}
