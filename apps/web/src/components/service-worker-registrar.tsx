"use client";

import { useEffect } from "react";
import { useSerwist } from "#src/components/serwist-provider.tsx";

/**
 * Registers the service worker with a rejection handler.
 *
 * `SerwistProvider` registers with a bare `void register()`, so a rejected
 * `/sw.js` fetch (CDN 429, preview-deployment redirect, network blip) becomes
 * an unhandled rejection that error tracking captures. Each browser words the
 * failure differently, so one root cause mints a fresh issue per message. A
 * failed registration only costs that page load its offline cache and is not
 * actionable, so this logs the rejection instead of letting it bubble. The
 * provider must therefore run with `register={false}`.
 */
export function ServiceWorkerRegistrar() {
  const { serwist } = useSerwist();

  useEffect(() => {
    serwist?.register().catch((error: unknown) => {
      console.warn("Service worker registration failed:", error);
    });
  }, [serwist]);

  return null;
}
