import type { ModelMessage } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it } from "vitest";
import { addCacheControlToMessages } from "./addCacheControlToMessages";

function anthropicModel() {
  return new MockLanguageModelV3({
    provider: "anthropic",
    modelId: "claude-sonnet-4-6",
  });
}

function openaiModel() {
  return new MockLanguageModelV3({ provider: "openai", modelId: "gpt-4o" });
}

function userMessage(text: string): ModelMessage {
  return { role: "user", content: [{ type: "text", text }] };
}

function assistantMessage(text: string): ModelMessage {
  return { role: "assistant", content: [{ type: "text", text }] };
}

describe("addCacheControlToMessages", () => {
  it("returns empty array unchanged", () => {
    const messages: ModelMessage[] = [];
    const result = addCacheControlToMessages({
      messages,
      model: anthropicModel(),
    });
    expect(result).toBe(messages);
  });

  it("appends cache control to the last message for Anthropic models", () => {
    const messages: ModelMessage[] = [
      userMessage("hello"),
      assistantMessage("hi there"),
    ];

    const result = addCacheControlToMessages({
      messages,
      model: anthropicModel(),
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toBe(messages[0]);
    expect(result[1]).not.toBe(messages[1]);
    expect(result[1].providerOptions).toEqual({
      anthropic: { cacheControl: { type: "ephemeral" } },
    });
  });

  it("preserves existing providerOptions on the last message", () => {
    const messages: ModelMessage[] = [
      {
        role: "user",
        content: [{ type: "text", text: "hello" }],
        providerOptions: { custom: { key: "value" } },
      },
    ];

    const result = addCacheControlToMessages({
      messages,
      model: anthropicModel(),
    });

    expect(result[0].providerOptions).toEqual({
      custom: { key: "value" },
      anthropic: { cacheControl: { type: "ephemeral" } },
    });
  });

  it("does not modify messages for non-Anthropic models", () => {
    const messages: ModelMessage[] = [
      userMessage("hello"),
      assistantMessage("hi there"),
    ];

    const result = addCacheControlToMessages({
      messages,
      model: openaiModel(),
    });

    expect(result).toBe(messages);
  });

  it("detects Anthropic models by provider name containing 'anthropic'", () => {
    const model = new MockLanguageModelV3({
      provider: "custom-anthropic-provider",
      modelId: "some-model",
    });
    const messages: ModelMessage[] = [userMessage("test")];

    const result = addCacheControlToMessages({ messages, model });

    expect(result[0].providerOptions).toEqual({
      anthropic: { cacheControl: { type: "ephemeral" } },
    });
  });

  it("detects Anthropic models by modelId containing 'claude'", () => {
    const model = new MockLanguageModelV3({
      provider: "custom-provider",
      modelId: "claude-3-haiku",
    });
    const messages: ModelMessage[] = [userMessage("test")];

    const result = addCacheControlToMessages({ messages, model });

    expect(result[0].providerOptions).toEqual({
      anthropic: { cacheControl: { type: "ephemeral" } },
    });
  });

  it("handles single message array", () => {
    const messages: ModelMessage[] = [userMessage("hello")];

    const result = addCacheControlToMessages({
      messages,
      model: anthropicModel(),
    });

    expect(result).toHaveLength(1);
    expect(result[0].providerOptions).toEqual({
      anthropic: { cacheControl: { type: "ephemeral" } },
    });
  });

  it("does not mutate the original messages array", () => {
    const messages: ModelMessage[] = [
      userMessage("first"),
      userMessage("second"),
    ];

    addCacheControlToMessages({ messages, model: anthropicModel() });

    expect(messages[1].providerOptions).toBeUndefined();
  });

  it("accepts custom providerOptions", () => {
    const messages: ModelMessage[] = [userMessage("test")];
    const customOptions = {
      anthropic: { cacheControl: { type: "max_tokens" as const } },
    };

    const result = addCacheControlToMessages({
      messages,
      model: anthropicModel(),
      providerOptions: customOptions,
    });

    expect(result[0].providerOptions).toEqual(customOptions);
  });
});
