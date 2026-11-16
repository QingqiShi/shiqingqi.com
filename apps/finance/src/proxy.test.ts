import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

function apiRequest(path: string, referer?: string, host?: string) {
  const headers = new Headers();
  if (referer) headers.set("Referer", referer);
  if (host) headers.set("Host", host);
  return new NextRequest(`http://localhost:3000${path}`, { headers });
}

describe("proxy referer validation for API routes", () => {
  it("allows requests with valid referer", () => {
    const response = proxy(
      apiRequest("/api/sync", "https://finance.qingqi.dev/transactions"),
    );

    expect(response.status).toBe(200);
  });

  it("rejects requests with no referer", () => {
    const response = proxy(apiRequest("/api/sync"));

    expect(response.status).toBe(403);
  });

  it("rejects requests with unauthorized or malformed referer", () => {
    expect(proxy(apiRequest("/api/sync", "https://evil.com")).status).toBe(403);
    expect(proxy(apiRequest("/api/sync", "not-a-url")).status).toBe(403);
  });

  it("rejects requests from other Vercel deployments", () => {
    process.env.VERCEL_URL = "my-app-abc123.vercel.app";
    process.env.VERCEL_BRANCH_URL =
      "my-app-git-feature-qingqishis-projects.vercel.app";
    const response = proxy(
      apiRequest(
        "/api/sync",
        "https://attacker-project-xyz789.vercel.app/transactions",
      ),
    );

    expect(response.status).toBe(403);
    delete process.env.VERCEL_URL;
    delete process.env.VERCEL_BRANCH_URL;
  });

  it("rejects a host that matches its own referer but is not a dev host", () => {
    process.env.ALLOWED_DEV_ORIGINS = "192.168.1.72";
    const response = proxy(
      apiRequest(
        "/api/sync",
        "http://evil.com:3089/transactions",
        "evil.com:3089",
      ),
    );

    expect(response.status).toBe(403);
    delete process.env.ALLOWED_DEV_ORIGINS;
  });
});

describe("proxy for cron routes", () => {
  it("lets a cron request with no referer through to its handler", () => {
    const response = proxy(apiRequest("/api/cron/bank-sync"));

    expect(response.status).toBe(200);
  });

  it("does not exempt a path that only starts like the cron path", () => {
    const response = proxy(apiRequest("/api/cronjob"));

    expect(response.status).toBe(403);
  });
});

describe("proxy locale", () => {
  it("redirects a cookie-less visitor to /zh by Accept-Language", () => {
    const response = proxy(
      new NextRequest("http://localhost:3000/", {
        headers: { "Accept-Language": "zh-CN,zh;q=0.9" },
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/zh");
  });
});
