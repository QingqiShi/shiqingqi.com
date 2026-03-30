import type { UIMessage } from "ai";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockStore = new Map<string, UIMessage[]>();

vi.mock("#src/session-store/session-store.ts", () => ({
  getSessionMessages: vi.fn((sessionId: string) => {
    return mockStore.get(sessionId) ?? null;
  }),
}));

import { POST } from "./route";

function sessionRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/ai-chat/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/ai-chat/session", () => {
  beforeEach(async () => {
    mockStore.clear();
    const { getSessionMessages } =
      await import("#src/session-store/session-store.ts");
    vi.mocked(getSessionMessages).mockImplementation((sessionId: string) => {
      return Promise.resolve(mockStore.get(sessionId) ?? null);
    });
  });

  it("returns messages for valid sessionId", async () => {
    const storedMessages: UIMessage[] = [
      {
        id: "msg-1",
        role: "user",
        parts: [{ type: "text", text: "hello" }],
      },
    ];
    mockStore.set("a0000000-0000-4000-8000-000000000001", storedMessages);

    const response = await POST(
      sessionRequest({ sessionId: "a0000000-0000-4000-8000-000000000001" }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      messages: storedMessages,
      sessionId: "a0000000-0000-4000-8000-000000000001",
    });
  });

  it("returns 404 for missing session", async () => {
    const response = await POST(
      sessionRequest({ sessionId: "a0000000-0000-4000-8000-000000000001" }),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "session-not-found" });
  });

  it("returns 400 when sessionId is missing", async () => {
    const response = await POST(sessionRequest({}));
    expect(response.status).toBe(400);
  });

  it("returns 400 when sessionId is invalid", async () => {
    const response = await POST(sessionRequest({ sessionId: "not-a-uuid" }));
    expect(response.status).toBe(400);
  });

  it("returns 500 when Redis read fails", async () => {
    const { getSessionMessages } =
      await import("#src/session-store/session-store.ts");
    vi.mocked(getSessionMessages).mockRejectedValueOnce(
      new Error("Redis timeout"),
    );

    const response = await POST(
      sessionRequest({ sessionId: "a0000000-0000-4000-8000-000000000001" }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Internal server error" });
  });
});
