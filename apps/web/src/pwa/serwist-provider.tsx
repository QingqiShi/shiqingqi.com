"use client";

import {
  SerwistProvider as BaseSerwistProvider,
  useSerwist,
} from "@serwist/next/react";
import { useEffect, type ReactNode } from "react";

// A remount of the [locale] tree (e.g. a locale switch) runs the effect again
// while `window.serwist` stays the same, and Serwist's own re-register guard
// is in development builds only.
let registered = false;

function ServiceWorkerRegistrar() {
  const { serwist } = useSerwist();

  useEffect(() => {
    if (!serwist || registered) return;
    registered = true;
    serwist.register().catch((error: unknown) => {
      console.warn("Service worker registration failed:", error);
    });
  }, [serwist]);

  return null;
}

/**
 * Serwist provider that also registers the service worker.
 *
 * Registration is manual (`register={false}` plus the registrar above), so a
 * rejected `/sw.js` fetch is caught here instead of becoming an unhandled
 * rejection that each browser words differently. The catch only logs, because
 * a failed registration is not actionable: that page load misses offline
 * caching and nothing else breaks. The two halves live in this one component
 * so they cannot be split.
 */
export function SerwistProvider({ children }: { children: ReactNode }) {
  return (
    <BaseSerwistProvider
      swUrl="/sw.js"
      register={false}
      disable={process.env.NODE_ENV === "development"}
      // sw.ts runtime caching (defaultCache + withLocaleRobustPageCaching)
      // already caches pages at fetch time, and the provider's CACHE_URLS
      // message can reject uncaught.
      cacheOnNavigation={false}
    >
      <ServiceWorkerRegistrar />
      {children}
    </BaseSerwistProvider>
  );
}
