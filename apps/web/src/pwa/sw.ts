import { defaultCache } from "@serwist/next/worker";
import { withLocaleRobustPageCaching } from "@tuja/pwa-runtime-caching/with-locale-robust-page-caching";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

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
  runtimeCaching: withLocaleRobustPageCaching(defaultCache),
});

serwist.addEventListeners();

// Finance moved to its own origin. Remove the Finance pages and Reports that
// it stored on this origin before the move.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.delete("finance-pages"),
      caches.delete("finance-reports"),
    ]),
  );
});
