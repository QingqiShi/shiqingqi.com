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

// Trip data is compiled into the page bundle and checklists live in
// localStorage, so a trip a visitor has opened once is fully readable offline:
// defaultCache keeps the last network-first copy of each visited page (HTML
// and RSC payloads) plus all static assets. Live weather and map embeds
// degrade gracefully — the page already ships seasonal fallbacks.
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: withLocaleRobustPageCaching(defaultCache),
  // The build precaches the offline page of each locale at its prefixed URL.
  // The first entry that matches the request and is in the precache wins.
  fallbacks: {
    entries: [
      {
        url: "/zh/~offline",
        matcher({ request }) {
          return (
            request.destination === "document" &&
            /^\/zh(?:\/|$)/.test(new URL(request.url).pathname)
          );
        },
      },
      {
        url: "/en/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
