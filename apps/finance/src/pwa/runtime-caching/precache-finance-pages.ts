import { FINANCE_SHELL_HEADER } from "#src/finance/http/constants.ts";
import { FINANCE_PAGES_CACHE } from "./finance-pages-cache.ts";
import { isFinanceShellResponse } from "./finance-runtime-caching.ts";
import { isPrecacheableFinancePath } from "./is-precacheable-finance-path.ts";

/** A stored page younger than this is not fetched again. */
export const PRECACHE_MAX_AGE_MS = 12 * 60 * 60 * 1_000;

export interface PrecacheFinancePagesOptions {
  origin: string;
  cacheStorage: {
    open: (name: string) => Promise<Pick<Cache, "match" | "put">>;
  };
  fetch: typeof fetch;
  now?: number;
}

function isFresh(response: Response | undefined, now: number) {
  const date = response?.headers.get("date");
  if (!date) return false;
  return now - new Date(date).getTime() < PRECACHE_MAX_AGE_MS;
}

/**
 * Stores the signed-in Finance pages at `paths` so that each screen opens
 * offline, also one the visitor never opened. It keeps only a page the
 * proxy marked as signed in (the same rule as a visited page), skips pages
 * stored in the last 12 hours, and fetches one page at a time.
 */
export async function precacheFinancePages(
  paths: readonly string[],
  {
    origin,
    cacheStorage,
    fetch,
    now = Date.now(),
  }: PrecacheFinancePagesOptions,
): Promise<number> {
  const cache = await cacheStorage.open(FINANCE_PAGES_CACHE);
  let stored = 0;
  for (const path of new Set(paths)) {
    if (!isPrecacheableFinancePath(path)) continue;
    const url = new URL(path, origin).href;
    if (isFresh(await cache.match(url), now)) continue;
    try {
      const response = await fetch(url, { credentials: "same-origin" });
      if (
        !isFinanceShellResponse(
          response.status,
          response.redirected,
          response.headers.get(FINANCE_SHELL_HEADER),
        )
      ) {
        continue;
      }
      await cache.put(url, response);
      stored++;
    } catch {
      return stored;
    }
  }
  return stored;
}
