// @vitest-environment node
import { NextRequest } from "next/server";
import { i18nRouter } from "next-i18n-router";
import { describe, expect, it } from "vitest";
import { keepLocalePreference } from "./keep-locale-preference.ts";

const i18nConfig = { locales: ["en", "zh"], defaultLocale: "en" };

function proxy(
  path: string,
  { cookie, headers }: { cookie?: string; headers?: Record<string, string> },
) {
  const request = new NextRequest(`http://localhost:3000${path}`, {
    headers: {
      ...headers,
      ...(cookie ? { Cookie: `NEXT_LOCALE=${cookie}` } : {}),
    },
  });
  return keepLocalePreference(request, i18nRouter(request, i18nConfig));
}

// Reads the raw header: ResponseCookies caches its parse at construction, so
// `response.cookies.get` is stale after the header is deleted.
function localeSetCookies(response: Response) {
  return response.headers
    .getSetCookie()
    .filter((setCookie) => setCookie.startsWith("NEXT_LOCALE="));
}

describe("keepLocalePreference", () => {
  it("issues the Preference again on the redirect from / to /zh", () => {
    const response = proxy("/", { cookie: "zh" });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/zh");
    expect(response.cookies.get("NEXT_LOCALE")?.value).toBe("zh");
  });

  // Before this, prefetches of the old Locale's links overwrote the Locale a
  // visitor had just picked, and the service worker's precache of
  // `/zh/~offline` made an English visitor's next page Chinese.
  it("lets a fetch of /zh leave an en Preference alone", () => {
    const response = proxy("/zh/page", {
      cookie: "en",
      headers: { "Sec-Fetch-Dest": "empty", "Sec-Fetch-Mode": "cors" },
    });

    expect(response.status).toBe(200);
    expect(localeSetCookies(response)).toEqual([]);
    expect(response.headers.get("x-middleware-set-cookie")).toBeNull();
  });

  it("lets a speculation-rules prefetch of /zh leave the Preference alone", () => {
    const response = proxy("/zh/page", {
      cookie: "en",
      headers: { "Sec-Fetch-Dest": "document", "Sec-Purpose": "prefetch" },
    });

    expect(localeSetCookies(response)).toEqual([]);
  });

  it("lets the path win on a document load of /zh", () => {
    const response = proxy("/zh/page", {
      cookie: "en",
      headers: { "Sec-Fetch-Dest": "document", "Sec-Fetch-Mode": "navigate" },
    });

    expect(response.status).toBe(200);
    expect(response.cookies.get("NEXT_LOCALE")?.value).toBe("zh");
  });
});
