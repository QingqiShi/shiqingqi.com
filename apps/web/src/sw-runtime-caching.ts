import { PAGES_CACHE_NAME } from "@serwist/next/worker";
import { Strategy, type RuntimeCaching, type SerwistPlugin } from "serwist";

const LOCALE_SENSITIVE_CACHE_NAMES = new Set<string>([
  PAGES_CACHE_NAME.html,
  PAGES_CACHE_NAME.rsc,
  PAGES_CACHE_NAME.rscPrefetch,
  "others",
]);

/**
 * Split out from the `cacheWillUpdate` plugin below so it's unit-testable
 * without constructing `redirected` Response objects.
 */
export function isCacheablePageResponse(
  status: number,
  redirected: boolean,
): boolean {
  return status === 200 && !redirected;
}

/**
 * A locale redirect arrives in three shapes depending on the fetch's redirect
 * mode: a followed redirect (200, `redirected`), an opaqueredirect (status 0),
 * or the raw 3xx itself.
 */
export function isRedirectResponse(
  status: number,
  redirected: boolean,
): boolean {
  return redirected || status === 0 || (status >= 300 && status < 400);
}

function createLocaleRobustCachingPlugin(cacheName: string): SerwistPlugin {
  return {
    cacheWillUpdate: async ({ request, response }) => {
      if (isCacheablePageResponse(response.status, response.redirected)) {
        return response;
      }
      if (isRedirectResponse(response.status, response.redirected)) {
        // The redirect proves this URL now resolves to the other locale, so
        // whatever the cache holds for it (any query variant) is stale —
        // evict it rather than replay the wrong locale when the network next
        // fails. Non-redirect failures (a 500 during a deploy) keep the
        // entry: it is still the best offline copy of the URL.
        const cache = await caches.open(cacheName);
        await cache.delete(request, { ignoreSearch: true });
      }
      return null;
    },
  };
}

/**
 * Unprefixed URLs serve locale-dependent content (a rewrite for `en`, a
 * redirect for `zh`), and these page caches key by request URL alone.
 * Serwist's default cacheability check admits followed redirects (200,
 * redirected) and opaqueredirects (status 0), so a Chinese payload can end up
 * stored under an English URL key and replayed whenever the network fails.
 * Rejecting those isn't enough on its own: an entry cached under one locale
 * goes stale the moment the visitor switches to the other, so observing a
 * redirect also evicts what the cache already holds for that URL.
 */
export function withLocaleRobustPageCaching(
  runtimeCaching: RuntimeCaching[],
): RuntimeCaching[] {
  for (const { handler } of runtimeCaching) {
    if (
      handler instanceof Strategy &&
      LOCALE_SENSITIVE_CACHE_NAMES.has(handler.cacheName)
    ) {
      handler.plugins.push(createLocaleRobustCachingPlugin(handler.cacheName));
    }
  }
  return runtimeCaching;
}
