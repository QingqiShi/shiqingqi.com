import { convertToModelMessages, streamText } from "ai";
import "server-only";
import { getAnthropicModel } from "./client";
import type { ChatInput } from "./schema";
import { getChatSystemInstructions } from "./system-instructions";

export { chatInputSchema, type ChatInput } from "./schema";

export async function chat({ messages, locale }: ChatInput) {
  const system = getChatSystemInstructions(locale);
  const modelMessages = await convertToModelMessages(messages);

  return streamText({
    model: getAnthropicModel(),
    system,
    messages: modelMessages,
  });
}
