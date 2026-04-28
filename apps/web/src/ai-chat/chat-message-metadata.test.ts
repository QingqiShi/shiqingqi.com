import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import {
  type ChatMessageMetadata,
  findLatestMoodFromMessages,
} from "./chat-message-metadata";

type Msg = UIMessage<ChatMessageMetadata>;

function msg(
  role: "user" | "assistant",
  metadata?: ChatMessageMetadata,
  id = `m-${Math.random().toString(36).slice(2, 8)}`,
): Msg {
  return { id, role, parts: [{ type: "text", text: "" }], metadata };
}

describe("findLatestMoodFromMessages", () => {
  it("returns undefined for an empty list", () => {
    expect(findLatestMoodFromMessages([])).toBeUndefined();
  });

  it("returns undefined when no assistant message carries a mood", () => {
    const messages = [msg("user", { mood: "warm" }), msg("assistant", {})];
    expect(findLatestMoodFromMessages(messages)).toBeUndefined();
  });

  it("returns the mood from the most recent assistant message", () => {
    const messages = [
      msg("assistant", { mood: "warm" }),
      msg("user"),
      msg("assistant", { mood: "tense" }),
    ];
    expect(findLatestMoodFromMessages(messages)).toBe("tense");
  });

  it("skips over later user messages to reach the prior assistant mood", () => {
    const messages = [
      msg("assistant", { mood: "cool" }),
      msg("user", { mood: "playful" }),
    ];
    expect(findLatestMoodFromMessages(messages)).toBe("cool");
  });

  it("ignores assistant messages without a mood", () => {
    const messages = [
      msg("assistant", { mood: "epic" }),
      msg("assistant"),
      msg("assistant", { inputTokens: 10 }),
    ];
    expect(findLatestMoodFromMessages(messages)).toBe("epic");
  });
});
