import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

function apiRequest(path: string, referer?: string, host?: string) {
  const headers = new Headers();
  if (referer) headers.set("Referer", referer);
  if (host) headers.set("Host", host);
  return new NextRequest(`http://localhost:3000${path}`, { headers });
}

function pageRequest(
  path: string,
  {
    cookie,
    acceptLanguage,
    headers: extraHeaders,
  }: {
    cookie?: string;
    acceptLanguage?: string;
    headers?: Record<string, string>;
  } = {},
) {
  const headers = new Headers(extraHeaders);
  if (cookie) headers.set("Cookie", `NEXT_LOCALE=${cookie}`);
  if (acceptLanguage) headers.set("Accept-Language", acceptLanguage);
  return new NextRequest(`http://localhost:3000${path}`, { headers });
}

// Reads the raw header: ResponseCookies caches its parse at construction, so
// `response.cookies.get` is stale after the proxy deletes the header.
function localeSetCookies(response: Response) {
  return response.headers
    .getSetCookie()
    .filter((setCookie) => setCookie.startsWith("NEXT_LOCALE="));
}

describe("proxy referer validation for API routes", () => {
  it("allows requests with valid referer", () => {
    const response = proxy(
      apiRequest("/api/ai-chat", "https://qingqi.dev/search"),
    );

    expect(response.status).toBe(200);
  });

  it("rejects requests with no referer", () => {
    const response = proxy(apiRequest("/api/ai-chat"));

    expect(response.status).toBe(403);
  });

  it("rejects requests with unauthorized or malformed referer", () => {
    expect(proxy(apiRequest("/api/ai-chat", "https://evil.com")).status).toBe(
      403,
    );
    expect(proxy(apiRequest("/api/ai-chat", "not-a-url")).status).toBe(403);
  });

  it("rejects requests from other Vercel deployments", () => {
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
    delete process.env.VERCEL_URL;
    delete process.env.VERCEL_BRANCH_URL;
  });

  it("rejects a host that matches its own referer but is not a dev host", () => {
    process.env.ALLOWED_DEV_ORIGINS = "192.168.1.72";
    const response = proxy(
      apiRequest(
        "/api/ai-chat",
        "http://evil.com:3089/movies",
        "evil.com:3089",
      ),
    );

    expect(response.status).toBe(403);
    delete process.env.ALLOWED_DEV_ORIGINS;
  });
});

describe("proxy locale", () => {
  it("re-sets NEXT_LOCALE=zh on the redirect from / to /zh", () => {
    const response = proxy(pageRequest("/", { cookie: "zh" }));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/zh");
    expect(response.cookies.get("NEXT_LOCALE")?.value).toBe("zh");
  });

  it("redirects a cookie-less visitor to /zh by Accept-Language", () => {
    const response = proxy(
      pageRequest("/", { acceptLanguage: "zh-CN,zh;q=0.9" }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/zh");
  });

  // Before this, prefetches of the old Locale's links overwrote the Locale a
  // visitor had just picked.
  it("a prefetch of /zh leaves an en Preference alone", () => {
    const response = proxy(
      pageRequest("/zh/design-system", {
        cookie: "en",
        headers: { "Sec-Fetch-Dest": "empty", "Sec-Fetch-Mode": "cors" },
      }),
    );

    expect(response.status).toBe(200);
    expect(localeSetCookies(response)).toEqual([]);
    expect(response.headers.get("x-middleware-set-cookie")).toBeNull();
  });

  it("a document navigation to /zh still lets the path win", () => {
    const response = proxy(
      pageRequest("/zh/design-system", {
        cookie: "en",
        headers: { "Sec-Fetch-Dest": "document", "Sec-Fetch-Mode": "navigate" },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.cookies.get("NEXT_LOCALE")?.value).toBe("zh");
  });
});
