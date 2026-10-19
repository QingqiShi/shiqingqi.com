import {
  NetworkFirst,
  NetworkOnly,
  type RuntimeCaching,
  type SerwistPlugin,
} from "serwist";
import { FINANCE_SHELL_HEADER } from "#src/finance/http/constants.ts";
import { FINANCE_OFFLINE_HEADER } from "./finance-offline-header.ts";
import { FINANCE_PAGES_CACHE } from "./finance-pages-cache.ts";
import { FINANCE_REPORTS_CACHE } from "./finance-reports-cache.ts";
import { offlineRedirectFor } from "./offline-redirect-for.ts";

const FINANCE_PAGE = /^(?:\/zh)?\/finance(?:\/|$)/;
const REPORT_API = /^\/api\/finance\/reports(?:\/[^/]+)?$/;
const NETWORK_TIMEOUT_SECONDS = 3;

/**
 * A Finance page may be stored for offline use only when it is a plain 200
 * that the proxy marked as a signed-in page. A redirect to sign-in or a page
 * for a visitor without a session is never stored.
 */
export function isFinanceShellResponse(
  status: number,
  redirected: boolean,
  shellHeader: string | null,
) {
  return status === 200 && !redirected && shellHeader === "1";
}

const shellOnly: SerwistPlugin = {
  cacheWillUpdate: ({ response }) =>
    Promise.resolve(
      isFinanceShellResponse(
        response.status,
        response.redirected,
        response.headers.get(FINANCE_SHELL_HEADER),
      )
        ? response
        : null,
    ),
};

/**
 * When a Finance page is neither on the network nor stored: a client-side
 * navigation gets an error marked as offline, so the router falls back to a
 * full page load unless the visitor went on to another screen
 * (`guardOfflineNavigations`); a page load gets the same screen stored
 * under another query, or the stored screen that shows the same thing
 * (`offlineRedirectFor`).
 */
const offlineFallback: SerwistPlugin = {
  handlerDidError: async ({ request }) => {
    if (request.headers.get("RSC") === "1") {
      return new Response(null, {
        status: 503,
        headers: { [FINANCE_OFFLINE_HEADER]: "1" },
      });
    }
    if (request.mode !== "navigate") return undefined;
    const url = new URL(request.url);
    const cache = await caches.open(FINANCE_PAGES_CACHE);
    const stored = await cache.matchAll(url.href, { ignoreSearch: true });
    const page = stored.find((response) =>
      response.headers.get("content-type")?.startsWith("text/html"),
    );
    if (page) return page;
    const redirect = offlineRedirectFor(url);
    return redirect
      ? Response.redirect(new URL(redirect, url.origin).href, 302)
      : undefined;
  },
};

/** The Reports list and one Report, which a device keeps for offline use. Not the share image. */
export function isReportApiPath(pathname: string) {
  return REPORT_API.test(pathname);
}

/**
 * Finance offline rules, ahead of the defaults. Its pages and their RSC
 * payloads come from the network first, falling back to the last signed-in
 * copy after 3 s, and then to `offlineFallback`. The Reports API does the same
 * with the last 200 answer; the rest of its API never touches a cache (the
 * Replica is the offline layer).
 */
export const financeRuntimeCaching: RuntimeCaching[] = [
  {
    matcher: ({ url, sameOrigin }) =>
      sameOrigin && isReportApiPath(url.pathname),
    method: "GET",
    handler: new NetworkFirst({
      cacheName: FINANCE_REPORTS_CACHE,
      networkTimeoutSeconds: NETWORK_TIMEOUT_SECONDS,
    }),
  },
  {
    matcher: ({ url, sameOrigin }) =>
      sameOrigin && url.pathname.startsWith("/api/finance/"),
    method: "GET",
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ url, sameOrigin }) =>
      sameOrigin && url.pathname.startsWith("/api/finance/"),
    method: "POST",
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ url, request, sameOrigin }) =>
      sameOrigin &&
      FINANCE_PAGE.test(url.pathname) &&
      (request.mode === "navigate" || request.headers.get("RSC") === "1"),
    handler: new NetworkFirst({
      cacheName: FINANCE_PAGES_CACHE,
      networkTimeoutSeconds: NETWORK_TIMEOUT_SECONDS,
      plugins: [shellOnly, offlineFallback],
    }),
  },
];
