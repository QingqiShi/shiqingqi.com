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

vi.mock("./client", () => ({
  getRedisClient: () => mockRedis,
}));

import {
  generateSessionId,
  getSessionMessages,
  saveSessionMessages,
} from "./session-store";

function userMessage(text: string): UIMessage {
  return {
    id: `msg-${text}`,
    role: "user",
    parts: [{ type: "text", text }],
  };
}

describe("session-store", () => {
  it("returns null for a non-existent session", async () => {
    const result = await getSessionMessages("non-existent-id");
    expect(result).toBeNull();
  });

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

  it("generates unique session IDs", () => {
    const id1 = generateSessionId();
    const id2 = generateSessionId();
    expect(id1).not.toBe(id2);
    // UUID v4 format
    expect(id1).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});
