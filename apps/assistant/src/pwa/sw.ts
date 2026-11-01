import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// The worker precaches the build's static assets only. Pages hold a user's
// mail, so no cache keeps them after sign-out.
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
});

serwist.addEventListeners();

interface PushMessage {
  title: string;
  body: string;
  url: string;
}

function readPushMessage(data: PushMessageData | null): PushMessage {
  const fallback = { title: "Mail Assistant", body: "", url: "/" };
  let value: unknown;
  try {
    value = data?.json();
  } catch {
    return fallback;
  }
  if (typeof value !== "object" || value === null) return fallback;
  const url = "url" in value && typeof value.url === "string" ? value.url : "";
  return {
    title:
      "title" in value && typeof value.title === "string"
        ? value.title
        : fallback.title,
    body:
      "body" in value && typeof value.body === "string"
        ? value.body
        : fallback.body,
    // Only a path of this app: a push never opens another site.
    url: url.startsWith("/") && !url.startsWith("//") ? url : fallback.url,
  };
}

self.addEventListener("push", (event) => {
  const message = readPushMessage(event.data);
  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      tag: "digest",
      data: { url: message.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data: unknown = event.notification.data;
  const path =
    typeof data === "object" &&
    data !== null &&
    "url" in data &&
    typeof data.url === "string"
      ? data.url
      : "/";
  const target = new URL(path, self.location.origin).href;
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (windows) => {
        const open = windows.find((client) =>
          client.url.startsWith(self.location.origin),
        );
        if (open) {
          await open.focus();
          await open.navigate(target);
          return;
        }
        await self.clients.openWindow(target);
      }),
  );
});
