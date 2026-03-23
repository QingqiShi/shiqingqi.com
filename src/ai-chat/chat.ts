import { convertToModelMessages, stepCountIs, streamText } from "ai";
import "server-only";
import { getAnthropicModel } from "./client";
import type { ChatInput } from "./schema";
import { getChatSystemInstructions } from "./system-instructions";
import { createSemanticSearchTool } from "./tools/semantic-search";

export { chatInputSchema, type ChatInput } from "./schema";

export async function chat({ messages, locale }: ChatInput) {
  const system = getChatSystemInstructions(locale);
  const modelMessages = await convertToModelMessages(messages);

  return streamText({
    model: getAnthropicModel(),
    system,
    messages: modelMessages,
    tools: { semantic_search: createSemanticSearchTool(locale) },
    stopWhen: stepCountIs(5),
  });
}
