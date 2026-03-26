import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

function apiRequest(path: string, referer?: string) {
  const headers = new Headers();
  if (referer) headers.set("Referer", referer);
  return new NextRequest(`http://localhost:3000${path}`, { headers });
}

describe("proxy referer validation for API routes", () => {
  it("allows requests with valid referer", () => {
    const response = proxy(
      apiRequest("/api/ai-chat", "https://qingqi.dev/search"),
    );

    expect(response.status).toBe(200);
  });

  it("allows requests with localhost referer", () => {
    const response = proxy(
      apiRequest("/api/ai-chat", "http://localhost:3000/search"),
    );

    expect(response.status).toBe(200);
  });

  it("rejects requests with no referer", async () => {
    const response = proxy(apiRequest("/api/ai-chat"));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("rejects requests with unauthorized referer", async () => {
    const response = proxy(apiRequest("/api/ai-chat", "https://evil.com"));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("rejects requests with malformed referer", async () => {
    const response = proxy(apiRequest("/api/ai-chat", "not-a-url"));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("allows requests from Vercel preview deployments", () => {
    const response = proxy(
      apiRequest("/api/ai-chat", "https://my-app-abc123.vercel.app/search"),
    );

    expect(response.status).toBe(200);
  });

  it("rejects requests from domains ending in vercel.app that are not subdomains", async () => {
    const response = proxy(
      apiRequest("/api/ai-chat", "https://evilvercel.app/search"),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });
});
