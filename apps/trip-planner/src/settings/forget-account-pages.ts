/**
 * Removes every page that the service worker kept, so that this device does
 * not show the trips or the account again when it has no network. The
 * precache stays: it holds the offline page and no page of a user.
 */
export async function forgetAccountPages() {
  if (!("caches" in globalThis)) return;
  for (const name of await caches.keys()) {
    if (name.includes("precache")) continue;
    const cache = await caches.open(name);
    for (const request of await cache.keys()) {
      if (!new URL(request.url).pathname.startsWith("/_next/static/")) {
        await cache.delete(request);
      }
    }
  }
}
