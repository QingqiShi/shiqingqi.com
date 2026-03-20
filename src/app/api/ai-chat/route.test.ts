import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("#src/ai-chat/chat.ts", () => ({
  chatInputSchema: z.object({
    message: z.string().min(1).max(2000),
    locale: z.enum(["en", "zh"]).default("en"),
  }),
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

describe("POST /api/ai-chat", () => {
  it("returns 200 with valid message", async () => {
    const { chat } = await import("#src/ai-chat/chat.ts");
    vi.mocked(chat).mockResolvedValueOnce({ text: "Great movie!" });

    const response = await POST(
      chatRequest({ message: "recommend a sci-fi movie" }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      text: "Great movie!",
    });
  });

  it("returns 400 for missing message", async () => {
    const response = await POST(chatRequest({}));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      error: "Invalid request body",
    });
  });

  it("returns 400 for empty message", async () => {
    const response = await POST(chatRequest({ message: "" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      error: "Invalid request body",
    });
  });

  it("returns 400 for invalid locale", async () => {
    const response = await POST(
      chatRequest({ message: "hello", locale: "fr" }),
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

    const response = await POST(chatRequest({ message: "hello" }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      success: false,
      error: "API key invalid",
    });
  });
});
