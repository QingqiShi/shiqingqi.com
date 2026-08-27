import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

function apiRequest(path: string, referer?: string) {
  const headers = new Headers();
  if (referer) headers.set("Referer", referer);
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

/** What the browser sends for a Link prefetch. */
function prefetchRequest(path: string, { cookie }: { cookie?: string } = {}) {
  return pageRequest(path, {
    cookie,
    headers: { "Sec-Fetch-Dest": "empty", "Sec-Fetch-Mode": "cors" },
  });
}

/** What the browser sends for a document load the visitor asked for. */
function documentRequest(path: string, { cookie }: { cookie?: string } = {}) {
  return pageRequest(path, {
    cookie,
    headers: { "Sec-Fetch-Dest": "document", "Sec-Fetch-Mode": "navigate" },
  });
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

describe("proxy locale cookie durability", () => {
  it("re-sets NEXT_LOCALE=en for a default-locale rewrite at /", () => {
    const response = proxy(pageRequest("/", { cookie: "en" }));

    expect(response.status).toBe(200);
    const cookie = response.cookies.get("NEXT_LOCALE");
    expect(cookie?.value).toBe("en");
    expect(cookie?.maxAge).toBe(31536000);
  });

  it("re-sets NEXT_LOCALE=en for a default-locale rewrite on a nested path", () => {
    const response = proxy(
      pageRequest("/experiences/citadel", { cookie: "en" }),
    );

    expect(response.status).toBe(200);
    expect(response.cookies.get("NEXT_LOCALE")?.value).toBe("en");
  });

  it("re-sets NEXT_LOCALE=zh on the redirect from / to /zh", () => {
    const response = proxy(pageRequest("/", { cookie: "zh" }));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/zh");
    expect(response.cookies.get("NEXT_LOCALE")?.value).toBe("zh");
  });

  it("re-sets NEXT_LOCALE=zh at /zh when the library itself leaves it untouched", () => {
    const response = proxy(pageRequest("/zh", { cookie: "zh" }));

    expect(response.status).toBe(200);
    expect(response.cookies.get("NEXT_LOCALE")?.value).toBe("zh");
  });

  it("lets the library's cookie win on a request without Sec-Fetch headers", () => {
    const response = proxy(pageRequest("/zh", { cookie: "en" }));

    expect(response.cookies.get("NEXT_LOCALE")?.value).toBe("zh");
  });

  it("sets no NEXT_LOCALE cookie at / when the request has none", () => {
    const response = proxy(pageRequest("/"));

    expect(response.cookies.get("NEXT_LOCALE")).toBeUndefined();
  });

  it("sets no NEXT_LOCALE cookie when Accept-Language redirects a cookie-less visitor to /zh", () => {
    const response = proxy(
      pageRequest("/", { acceptLanguage: "zh-CN,zh;q=0.9" }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/zh");
    expect(response.cookies.get("NEXT_LOCALE")).toBeUndefined();
  });

  it("sets no NEXT_LOCALE cookie for an unsupported locale cookie", () => {
    const response = proxy(pageRequest("/", { cookie: "fr" }));

    expect(response.cookies.get("NEXT_LOCALE")).toBeUndefined();
  });
});

describe("proxy locale cookie on requests the visitor did not make", () => {
  // Next deletes `RSC` and `Next-Router-Prefetch` before the proxy runs, so a
  // prefetch is recognised by the browser's own `Sec-Fetch-Dest` /
  // `Sec-Purpose` instead. Before this, prefetches of the old Locale's links
  // overwrote the Locale a visitor had just picked.
  it("a prefetch of /zh leaves an en Preference alone", () => {
    const response = proxy(
      prefetchRequest("/zh/design-system", { cookie: "en" }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-next-i18n-router-locale")).toBe("zh");
    expect(localeSetCookies(response)).toEqual([]);
    expect(response.headers.get("x-middleware-set-cookie")).toBeNull();
  });

  it("a speculation-rules prefetch that asks for a document leaves it alone too", () => {
    const response = proxy(
      pageRequest("/zh", {
        cookie: "en",
        headers: {
          "Sec-Fetch-Dest": "document",
          "Sec-Purpose": "prefetch;prerender",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(localeSetCookies(response)).toEqual([]);
  });

  it("a prefetch of an unprefixed path leaves the Preference alone", () => {
    const response = proxy(prefetchRequest("/design-system", { cookie: "en" }));

    expect(response.status).toBe(200);
    expect(localeSetCookies(response)).toEqual([]);
  });

  it("a prefetch still follows the Preference's redirect", () => {
    const response = proxy(prefetchRequest("/design-system", { cookie: "zh" }));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/zh/design-system");
    expect(localeSetCookies(response)).toEqual([]);
  });

  it("a document navigation to /zh still lets the path win", () => {
    const response = proxy(
      documentRequest("/zh/design-system", { cookie: "en" }),
    );

    expect(response.status).toBe(200);
    expect(response.cookies.get("NEXT_LOCALE")?.value).toBe("zh");
  });
});
