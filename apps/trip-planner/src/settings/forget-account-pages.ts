import { normalizePath } from "@tuja/i18n/normalize-path";

/**
 * Removes the Settings page from the service worker's caches, so that this
 * device does not show the account again when it has no network.
 */
export async function forgetAccountPages() {
  if (!("caches" in globalThis)) return;
  for (const name of await caches.keys()) {
    const cache = await caches.open(name);
    for (const request of await cache.keys()) {
      if (normalizePath(new URL(request.url).pathname) === "/settings") {
        await cache.delete(request);
      }
    }
  }
}
