import { FINANCE_OFFLINE_HEADER } from "#src/pwa/runtime-caching/finance-offline-header.ts";

const RSC_HEADER = "rsc";
const RSC_SEARCH_PARAM = "_rsc";

function headersOf(input: RequestInfo | URL, init: RequestInit | undefined) {
  return new Headers(
    init?.headers ?? (input instanceof Request ? input.headers : undefined),
  );
}

function urlOf(input: RequestInfo | URL, base: string) {
  if (input instanceof URL) return new URL(input.href);
  return new URL(typeof input === "string" ? input : input.url, base);
}

function screenOf(url: URL) {
  const search = new URLSearchParams(url.search);
  search.delete(RSC_SEARCH_PARAM);
  search.sort();
  return `${url.pathname}?${search.toString()}`;
}

/** The router fetches a screen for a navigation at the default priority, and prefetches at low priority. */
function isNavigationData(headers: Headers, init: RequestInit | undefined) {
  return headers.get(RSC_HEADER) === "1" && init?.priority !== "low";
}

/**
 * Keeps the offline error for a screen's data from undoing a later
 * navigation. The router answers that error with a full page load of the
 * screen it asked for, also when the visitor has since gone to another
 * screen. When the address changed after the request and no longer shows
 * that screen, the response never arrives, so the router stays where the
 * visitor is. Returns the cleanup.
 */
export function guardOfflineNavigations(scope: Window = window) {
  const original = scope.fetch.bind(scope);
  const guarded = async (input: RequestInfo | URL, init?: RequestInit) => {
    const sent = original(input, init);
    if (!isNavigationData(headersOf(input, init), init)) return sent;
    const issuedAt = scope.location.href;
    const response = await sent;
    if (response.headers.get(FINANCE_OFFLINE_HEADER) !== "1") return response;
    const here = scope.location.href;
    const wanted = urlOf(input, issuedAt);
    if (here !== issuedAt && screenOf(new URL(here)) !== screenOf(wanted)) {
      return new Promise<Response>(() => undefined);
    }
    return response;
  };
  scope.fetch = guarded;
  return () => {
    if (scope.fetch === guarded) scope.fetch = original;
  };
}
