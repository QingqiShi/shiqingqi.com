// Cleanup service worker - unregisters the old SW at /serwist/sw.js
// This allows the new SW at /sw.js to take over
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", async (event) => {
  event.waitUntil(
    (async () => {
      // Clear all caches
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));

      // Unregister this service worker
      const registration = await self.registration;
      await registration.unregister();

      // Claim clients so they get the message
      await self.clients.claim();

      // Notify all clients to reload
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach((client) => client.navigate(client.url));
    })(),
  );
});
