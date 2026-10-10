import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";
import { FINANCE_PAGES_CACHE } from "#src/pwa/runtime-caching/finance-pages-cache.ts";
import { financeRuntimeCaching } from "#src/pwa/runtime-caching/finance-runtime-caching.ts";
import { isFinancePrecacheMessage } from "#src/pwa/runtime-caching/is-finance-precache-message.ts";
import { precacheFinancePages } from "#src/pwa/runtime-caching/precache-finance-pages.ts";
import { withLocaleRobustPageCaching } from "#src/pwa/runtime-caching/with-locale-robust-page-caching.ts";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    ...financeRuntimeCaching,
    ...withLocaleRobustPageCaching(defaultCache),
  ],
});

serwist.addEventListeners();

// A stored Finance page names the script chunks of its own build. A new
// worker comes with a new build, so the pages of the old build are deleted.
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.delete(FINANCE_PAGES_CACHE));
});

self.addEventListener("message", (event) => {
  if (!isFinancePrecacheMessage(event.data)) return;
  event.waitUntil(
    precacheFinancePages(event.data.paths, {
      origin: self.location.origin,
      cacheStorage: caches,
      fetch: (input, init) => fetch(input, init),
    }),
  );
});
