import { describe, expect, it } from "vitest";
import { FINANCE_SHELL_HEADER } from "#src/finance/http/constants.ts";
import { FINANCE_PAGES_CACHE } from "./finance-pages-cache.ts";
import {
  PRECACHE_MAX_AGE_MS,
  precacheFinancePages,
} from "./precache-finance-pages.ts";

const ORIGIN = "https://qingqi.dev";
const NOW = Date.parse("2026-10-10T12:00:00Z");

function keyOf(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  return input instanceof URL ? input.href : input.url;
}

function createCacheStorage() {
  const entries = new Map<string, Response>();
  const cache: Pick<Cache, "match" | "put"> = {
    match: (url) => Promise.resolve(entries.get(keyOf(url))?.clone()),
    put: (url, response) => {
      entries.set(keyOf(url), response);
      return Promise.resolve();
    },
  };
  const opened: string[] = [];
  const storage = {
    open: (name: string) => {
      opened.push(name);
      return Promise.resolve(cache);
    },
  };
  return { entries, opened, storage };
}

function page({
  shell = true,
  date = new Date(NOW).toUTCString(),
} = {}): Response {
  const headers = new Headers({ "content-type": "text/html", date });
  if (shell) headers.set(FINANCE_SHELL_HEADER, "1");
  return new Response("<html></html>", { status: 200, headers });
}

describe("precacheFinancePages", () => {
  it("stores signed-in pages and skips the rest", async () => {
    const { entries, opened, storage } = createCacheStorage();
    const fetched: string[] = [];
    const stored = await precacheFinancePages(
      ["/finance", "/zh/finance/analytics", "/finance/sign-in", "/other"],
      {
        origin: ORIGIN,
        cacheStorage: storage,
        fetch: (input) => {
          const url = keyOf(input);
          fetched.push(url);
          return Promise.resolve(page({ shell: !url.endsWith("/analytics") }));
        },
        now: NOW,
      },
    );
    expect(opened).toEqual([FINANCE_PAGES_CACHE]);
    expect(fetched).toEqual([
      `${ORIGIN}/finance`,
      `${ORIGIN}/zh/finance/analytics`,
    ]);
    expect(stored).toBe(1);
    expect([...entries.keys()]).toEqual([`${ORIGIN}/finance`]);
  });

  it("fetches a stored page again only when it is old", async () => {
    const { entries, storage } = createCacheStorage();
    entries.set(`${ORIGIN}/finance`, page());
    entries.set(
      `${ORIGIN}/finance/reports`,
      page({ date: new Date(NOW - PRECACHE_MAX_AGE_MS - 1).toUTCString() }),
    );
    const fetched: string[] = [];
    await precacheFinancePages(["/finance", "/finance/reports"], {
      origin: ORIGIN,
      cacheStorage: storage,
      fetch: (input) => {
        fetched.push(keyOf(input));
        return Promise.resolve(page());
      },
      now: NOW,
    });
    expect(fetched).toEqual([`${ORIGIN}/finance/reports`]);
  });

  it("stops at the first network error", async () => {
    const { storage } = createCacheStorage();
    let calls = 0;
    const stored = await precacheFinancePages(
      ["/finance", "/finance/reports"],
      {
        origin: ORIGIN,
        cacheStorage: storage,
        fetch: () => {
          calls++;
          return Promise.reject(new TypeError("offline"));
        },
        now: NOW,
      },
    );
    expect(stored).toBe(0);
    expect(calls).toBe(1);
  });
});
