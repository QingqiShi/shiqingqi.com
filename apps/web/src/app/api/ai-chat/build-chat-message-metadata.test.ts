import { describe, expect, it, vi } from "vitest";
import { buildChatMessageMetadata } from "./build-chat-message-metadata";

const SESSION_ID = "a0000000-0000-4000-8000-000000000001";

describe("buildChatMessageMetadata", () => {
  it("emits mood metadata for valid classify_mood tool calls", () => {
    const result = buildChatMessageMetadata(
      {
        type: "tool-call",
        toolName: "classify_mood",
        toolCallId: "call-1",
        input: { mood: "tense" },
      },
      SESSION_ID,
    );
    expect(result).toEqual({ mood: "tense" });
  });

  it("swallows invalid classify_mood payloads and warns", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = buildChatMessageMetadata(
      {
        type: "tool-call",
        toolName: "classify_mood",
        toolCallId: "call-2",
        input: { mood: "spicy" },
      },
      SESSION_ID,
    );
    expect(result).toBeUndefined();
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it("ignores tool-calls for other tools", () => {
    const result = buildChatMessageMetadata(
      {
        type: "tool-call",
        toolName: "tmdb_search",
        toolCallId: "call-3",
        input: { query: "dune" },
      },
      SESSION_ID,
    );
    expect(result).toBeUndefined();
  });

  it("emits input tokens and sessionId on finish-step", () => {
    const result = buildChatMessageMetadata(
      {
        type: "finish-step",
        response: { id: "r1", timestamp: new Date(), modelId: "m" },
        usage: {
          inputTokens: 1234,
          outputTokens: 56,
          totalTokens: 1290,
          inputTokenDetails: {
            noCacheTokens: undefined,
            cacheReadTokens: undefined,
            cacheWriteTokens: undefined,
          },
          outputTokenDetails: {
            textTokens: undefined,
            reasoningTokens: undefined,
          },
        },
        finishReason: "stop",
        rawFinishReason: undefined,
        providerMetadata: undefined,
      },
      SESSION_ID,
    );
    expect(result).toEqual({ inputTokens: 1234, sessionId: SESSION_ID });
  });

  it("returns undefined for unrelated parts", () => {
    const result = buildChatMessageMetadata(
      { type: "text-start", id: "t1" },
      SESSION_ID,
    );
    expect(result).toBeUndefined();
  });
});
