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

  it("allows requests with localhost on any port", () => {
    const response = proxy(
      apiRequest("/api/ai-chat", "http://localhost:5173/search"),
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

  it("allows requests from the current Vercel deployment URL", () => {
    process.env.VERCEL_URL = "my-app-abc123.vercel.app";
    const response = proxy(
      apiRequest("/api/ai-chat", "https://my-app-abc123.vercel.app/search"),
    );

    expect(response.status).toBe(200);
    delete process.env.VERCEL_URL;
  });

  it("allows requests from the Vercel branch URL", () => {
    process.env.VERCEL_BRANCH_URL =
      "my-app-git-feature-qingqishis-projects.vercel.app";
    const response = proxy(
      apiRequest(
        "/api/ai-chat",
        "https://my-app-git-feature-qingqishis-projects.vercel.app/search",
      ),
    );

    expect(response.status).toBe(200);
    delete process.env.VERCEL_BRANCH_URL;
  });

  it("rejects requests from other Vercel deployments", async () => {
    process.env.VERCEL_URL = "my-app-abc123.vercel.app";
    process.env.VERCEL_BRANCH_URL =
      "my-app-git-feature-qingqishis-projects.vercel.app";
    const response = proxy(
      apiRequest(
        "/api/ai-chat",
        "https://attacker-project-xyz789.vercel.app/search",
      ),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    delete process.env.VERCEL_URL;
    delete process.env.VERCEL_BRANCH_URL;
  });
});
