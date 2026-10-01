import type { ModelMessage, JSONValue, LanguageModel } from "ai";

function isAnthropicModel(model: LanguageModel) {
  if (typeof model === "string") {
    return model.includes("anthropic") || model.includes("claude");
  }
  return (
    model.provider === "anthropic" ||
    model.provider.includes("anthropic") ||
    model.modelId.includes("anthropic") ||
    model.modelId.includes("claude")
  );
}

export function addCacheControlToMessages({
  messages,
  model,
  providerOptions = {
    anthropic: { cacheControl: { type: "ephemeral" } },
  },
}: {
  messages: ModelMessage[];
  model: LanguageModel;
  providerOptions?: Record<string, Record<string, JSONValue>>;
}): ModelMessage[] {
  if (messages.length === 0) return messages;
  if (!isAnthropicModel(model)) return messages;

  const last = messages[messages.length - 1];
  return [
    ...messages.slice(0, -1),
    {
      ...last,
      providerOptions: {
        ...last.providerOptions,
        ...providerOptions,
      },
    },
  ];
}
