import { assistantFetch } from "../http/assistant-fetch.ts";

/**
 * Stops the morning report notification on this device before a sign-out, so
 * that the next person who uses this browser does not get the user's
 * headlines. The browser's subscription goes even when the server is not
 * reached: its endpoint then fails, and the next push removes the row. It does
 * nothing where the browser has no service worker, as under `pnpm dev`.
 */
export async function unsubscribeThisDevice() {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  try {
    await assistantFetch("/api/push", {
      method: "DELETE",
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
  } finally {
    await subscription.unsubscribe();
  }
}
