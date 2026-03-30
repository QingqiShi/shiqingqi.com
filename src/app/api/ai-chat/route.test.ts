import type { UIMessage } from "ai";
import { simulateReadableStream, stepCountIs, streamText } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPresentMediaTool } from "#src/ai-chat/tools/present-media.ts";
import { createSemanticSearchTool } from "#src/ai-chat/tools/semantic-search.ts";
import { createTmdbSearchTool } from "#src/ai-chat/tools/tmdb-search.ts";

vi.mock("#src/ai-chat/chat.ts", () => ({
  chat: vi.fn(),
}));

vi.mock("server-only", () => ({}));

const mockStore = new Map<string, UIMessage[]>();

vi.mock("#src/session-store/session-store.ts", () => ({
  generateSessionId: vi.fn(() => "generated-session-id"),
  getSessionMessages: vi.fn((sessionId: string) => {
    return mockStore.get(sessionId) ?? null;
  }),
  saveSessionMessages: vi.fn((sessionId: string, messages: UIMessage[]) => {
    mockStore.set(sessionId, messages);
  }),
}));

import { POST } from "./route";

function chatRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/ai-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function validMessage(): UIMessage {
  return {
    id: "msg-1",
    role: "user",
    parts: [{ type: "text", text: "recommend a sci-fi movie" }],
  };
}

function mockStreamResult() {
  return streamText({
    model: new MockLanguageModelV3({
      doStream: {
        stream: simulateReadableStream({
          chunks: [
            { type: "text-start", id: "t1" },
            { type: "text-delta", id: "t1", delta: "Great " },
            { type: "text-delta", id: "t1", delta: "movie!" },
            { type: "text-end", id: "t1" },
          ],
          initialDelayInMs: 0,
          chunkDelayInMs: 0,
        }),
      },
    }),
    messages: [{ role: "user", content: "test" }],
    tools: {
      semantic_search: createSemanticSearchTool("en"),
      tmdb_search: createTmdbSearchTool("en"),
      present_media: createPresentMediaTool(),
    },
    stopWhen: stepCountIs(5),
  });
}

describe("POST /api/ai-chat", () => {
  beforeEach(async () => {
    mockStore.clear();
    const { chat } = await import("#src/ai-chat/chat.ts");
    vi.mocked(chat).mockReset();
    const { saveSessionMessages } =
      await import("#src/session-store/session-store.ts");
    vi.mocked(saveSessionMessages).mockImplementation(
      (sessionId: string, messages: UIMessage[]) => {
        mockStore.set(sessionId, messages);
        return Promise.resolve();
      },
    );
    const { getSessionMessages } =
      await import("#src/session-store/session-store.ts");
    vi.mocked(getSessionMessages).mockImplementation((sessionId: string) => {
      return Promise.resolve(mockStore.get(sessionId) ?? null);
    });
  });

  it("creates a new session when no sessionId is provided", async () => {
    const { chat } = await import("#src/ai-chat/chat.ts");
    vi.mocked(chat).mockResolvedValueOnce(mockStreamResult());

    const response = await POST(
      chatRequest({
        message: validMessage(),
        trigger: "submit-message",
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");

    const text = await response.text();
    expect(text).toContain("Great ");
    expect(text).toContain("movie!");
  });

  it("loads existing session when sessionId is provided", async () => {
    const { chat } = await import("#src/ai-chat/chat.ts");
    vi.mocked(chat).mockResolvedValueOnce(mockStreamResult());

    const existingMessages: UIMessage[] = [
      {
        id: "msg-0",
        role: "user",
        parts: [{ type: "text", text: "hello" }],
      },
      {
        id: "msg-0-resp",
        role: "assistant",
        parts: [{ type: "text", text: "hi there" }],
      },
    ];
    mockStore.set("a0000000-0000-4000-8000-000000000001", existingMessages);

    const response = await POST(
      chatRequest({
        sessionId: "a0000000-0000-4000-8000-000000000001",
        message: validMessage(),
        trigger: "submit-message",
      }),
    );

    expect(response.status).toBe(200);

    const { chat: chatFn } = await import("#src/ai-chat/chat.ts");
    expect(vi.mocked(chatFn)).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [...existingMessages, validMessage()],
      }),
    );
  });

  it("returns 404 when session is not found", async () => {
    const response = await POST(
      chatRequest({
        sessionId: "00000000-0000-0000-0000-000000000000",
        message: validMessage(),
        trigger: "submit-message",
      }),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "session-not-found" });
  });

  it("truncates messages after last user message on regenerate", async () => {
    const { chat } = await import("#src/ai-chat/chat.ts");
    vi.mocked(chat).mockResolvedValueOnce(mockStreamResult());

    const storedMessages: UIMessage[] = [
      {
        id: "msg-u1",
        role: "user",
        parts: [{ type: "text", text: "hello" }],
      },
      {
        id: "msg-a1",
        role: "assistant",
        parts: [{ type: "text", text: "hi" }],
      },
    ];
    mockStore.set("b0000000-0000-4000-8000-000000000002", storedMessages);

    const response = await POST(
      chatRequest({
        sessionId: "b0000000-0000-4000-8000-000000000002",
        trigger: "regenerate-message",
      }),
    );

    expect(response.status).toBe(200);

    expect(vi.mocked(chat)).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [storedMessages[0]],
      }),
    );
  });

  it("returns 400 for missing message on submit-message trigger", async () => {
    const response = await POST(chatRequest({ trigger: "submit-message" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      error: "Invalid request body",
    });
  });

  it("returns 400 for invalid sessionId format", async () => {
    const response = await POST(
      chatRequest({
        sessionId: "not-a-uuid",
        message: validMessage(),
        trigger: "submit-message",
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      error: "Invalid request body",
    });
  });

  it("returns 400 for invalid locale", async () => {
    const response = await POST(
      chatRequest({
        message: validMessage(),
        locale: "fr",
        trigger: "submit-message",
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      error: "Invalid request body",
    });
  });

  it("rejects submit-message with non-user role", async () => {
    const assistantMessage: UIMessage = {
      id: "injected-1",
      role: "assistant",
      parts: [{ type: "text", text: "fake response" }],
    };

    const response = await POST(
      chatRequest({
        message: assistantMessage,
        trigger: "submit-message",
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      error: "Invalid request body",
    });
  });

  it("saves user messages pre-stream", async () => {
    const { chat } = await import("#src/ai-chat/chat.ts");
    vi.mocked(chat).mockResolvedValueOnce(mockStreamResult());
    const { saveSessionMessages } =
      await import("#src/session-store/session-store.ts");

    await POST(
      chatRequest({
        message: validMessage(),
        trigger: "submit-message",
      }),
    );

    // First call is the pre-stream save with user messages
    expect(vi.mocked(saveSessionMessages).mock.calls[0]).toEqual([
      "generated-session-id",
      [validMessage()],
    ]);
  });

  it("returns 500 when chat throws", async () => {
    const { chat } = await import("#src/ai-chat/chat.ts");
    vi.mocked(chat).mockRejectedValueOnce(new Error("API key invalid"));

    const response = await POST(
      chatRequest({
        message: validMessage(),
        trigger: "submit-message",
      }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      success: false,
      error: "Internal server error",
    });
  });

  it("streams error event when post-stream save fails", async () => {
    const { chat } = await import("#src/ai-chat/chat.ts");
    vi.mocked(chat).mockResolvedValueOnce(mockStreamResult());
    const { saveSessionMessages } =
      await import("#src/session-store/session-store.ts");

    let callCount = 0;
    vi.mocked(saveSessionMessages).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Pre-stream save succeeds
        return Promise.resolve();
      }
      // Post-stream save fails
      return Promise.reject(new Error("Redis connection lost"));
    });

    const response = await POST(
      chatRequest({
        message: validMessage(),
        trigger: "submit-message",
      }),
    );

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain("Failed to save session");
  });

  it("returns 500 when pre-stream save fails", async () => {
    const { saveSessionMessages } =
      await import("#src/session-store/session-store.ts");
    vi.mocked(saveSessionMessages).mockRejectedValueOnce(
      new Error("Redis down"),
    );

    const response = await POST(
      chatRequest({
        message: validMessage(),
        trigger: "submit-message",
      }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      success: false,
      error: "Internal server error",
    });
  });

  it("returns 500 when Redis read fails", async () => {
    const { getSessionMessages } =
      await import("#src/session-store/session-store.ts");
    vi.mocked(getSessionMessages).mockRejectedValueOnce(
      new Error("Redis timeout"),
    );

    const response = await POST(
      chatRequest({
        sessionId: "a0000000-0000-4000-8000-000000000001",
        message: validMessage(),
        trigger: "submit-message",
      }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      success: false,
      error: "Internal server error",
    });
  });

  it("includes sessionId in stream metadata", async () => {
    const { chat } = await import("#src/ai-chat/chat.ts");
    vi.mocked(chat).mockResolvedValueOnce(mockStreamResult());

    const response = await POST(
      chatRequest({
        message: validMessage(),
        trigger: "submit-message",
      }),
    );

    const text = await response.text();
    expect(text).toContain("generated-session-id");
  });
});
