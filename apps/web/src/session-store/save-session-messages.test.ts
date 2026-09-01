import type { UIMessage } from "ai";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockRedisStore = new Map<string, { value: unknown; ex?: number }>();
const mockRedis = {
  get: vi.fn((key: string) => {
    const entry = mockRedisStore.get(key);
    return entry ? entry.value : null;
  }),
  set: vi.fn((key: string, value: unknown, opts?: { ex?: number }) => {
    mockRedisStore.set(key, { value, ex: opts?.ex });
  }),
};

vi.mock("./get-redis-client", () => ({
  getRedisClient: () => mockRedis,
}));

import { getSessionMessages } from "./get-session-messages";
import { saveSessionMessages } from "./save-session-messages";

function userMessage(text: string): UIMessage {
  return {
    id: `msg-${text}`,
    role: "user",
    parts: [{ type: "text", text }],
  };
}

describe("saveSessionMessages", () => {
  it("saves and retrieves messages", async () => {
    const messages = [userMessage("hello")];
    await saveSessionMessages("test-session", messages);
    const result = await getSessionMessages("test-session");
    expect(result).toEqual(messages);
  });

  it("saves with 24h TTL", async () => {
    const messages = [userMessage("hello")];
    await saveSessionMessages("ttl-session", messages);
    expect(mockRedis.set).toHaveBeenCalledWith(
      "chat-session:ttl-session",
      messages,
      { ex: 86400 },
    );
  });

  it("overwrites existing messages", async () => {
    const initial = [userMessage("first")];
    await saveSessionMessages("overwrite-session", initial);

    const updated = [userMessage("first"), userMessage("second")];
    await saveSessionMessages("overwrite-session", updated);

    const result = await getSessionMessages("overwrite-session");
    expect(result).toEqual(updated);
  });
});
