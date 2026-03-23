import { simulateReadableStream, stepCountIs, streamText } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { chatInputSchema } from "#src/ai-chat/schema.ts";
import { createSemanticSearchTool } from "#src/ai-chat/tools/semantic-search.ts";
import { createTmdbSearchTool } from "#src/ai-chat/tools/tmdb-search.ts";

vi.mock("#src/ai-chat/chat.ts", () => ({
  chatInputSchema,
  chat: vi.fn(),
}));

import { POST } from "./route";

function chatRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/ai-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function validMessages() {
  return [
    {
      id: "msg-1",
      role: "user",
      parts: [{ type: "text", text: "recommend a sci-fi movie" }],
    },
  ];
}

describe("POST /api/ai-chat", () => {
  it("returns a streaming response with valid messages", async () => {
    const { chat } = await import("#src/ai-chat/chat.ts");
    const result = streamText({
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
      },
      stopWhen: stepCountIs(5),
    });
    vi.mocked(chat).mockResolvedValueOnce(result);

    const response = await POST(chatRequest({ messages: validMessages() }));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(response.body).not.toBeNull();

    const text = await response.text();
    expect(text).toContain("Great ");
    expect(text).toContain("movie!");
  });

  it("returns 400 for missing messages", async () => {
    const response = await POST(chatRequest({}));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      error: "Invalid request body",
    });
  });

  it("returns 400 for empty messages array", async () => {
    const response = await POST(chatRequest({ messages: [] }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      error: "Invalid request body",
    });
  });

  it("returns 400 for invalid message format", async () => {
    const response = await POST(chatRequest({ messages: [{ text: "hello" }] }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      error: "Invalid request body",
    });
  });

  it("returns 400 for invalid locale", async () => {
    const response = await POST(
      chatRequest({ messages: validMessages(), locale: "fr" }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      error: "Invalid request body",
    });
  });

  it("returns 500 when chat throws", async () => {
    const { chat } = await import("#src/ai-chat/chat.ts");
    vi.mocked(chat).mockRejectedValueOnce(new Error("API key invalid"));

    const response = await POST(chatRequest({ messages: validMessages() }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      success: false,
      error: "Internal server error",
    });
  });
});
