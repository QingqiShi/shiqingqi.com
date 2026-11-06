import type { AnthropicLanguageModelOptions } from "@ai-sdk/anthropic";
import "server-only";
import { CONTEXT_MANAGEMENT_CONFIG } from "./context-management-config";

export const chatProviderOptions = {
  anthropic: {
    contextManagement: CONTEXT_MANAGEMENT_CONFIG,
    effort: "medium",
    // The system prompt contains the current date, and a deploy can change
    // it. A stored session that continues after such a change has old
    // thinking blocks. Drop these blocks. Do not fail the request.
    thinking: {
      type: "adaptive",
      blockBinding: { prefixMismatchBehavior: "drop_block" },
    },
    fallbacks: "default",
  } satisfies AnthropicLanguageModelOptions,
};
