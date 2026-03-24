import type { LanguageModel } from "ai";
import { convertToModelMessages, stepCountIs, streamText } from "ai";
import "server-only";
import { addCacheControlToMessages } from "./addCacheControlToMessages";
import { getAnthropicModel } from "./client";
import type { ChatInput } from "./schema";
import { getChatSystemInstructions } from "./system-instructions";
import { createSemanticSearchTool } from "./tools/semantic-search";

export { chatInputSchema, type ChatInput } from "./schema";

interface ChatOptions extends ChatInput {
  model?: LanguageModel;
}

export async function chat({ messages, locale, model }: ChatOptions) {
  const system = getChatSystemInstructions(locale);
  const modelMessages = await convertToModelMessages(messages);

  return streamText({
    model: model ?? getAnthropicModel(),
    system,
    messages: modelMessages,
    tools: { semantic_search: createSemanticSearchTool(locale) },
    stopWhen: stepCountIs(5),
    prepareStep: ({ messages, model }) => ({
      messages: addCacheControlToMessages({ messages, model }),
    }),
  });
}
