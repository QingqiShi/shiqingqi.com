import "server-only";
import webPush from "web-push";
import { isPushServiceEndpoint } from "./is-push-service-endpoint.ts";
import type { DevicePushSubscription } from "./push-devices.ts";

const VAPID_SUBJECT = "https://assistant.qingqi.dev";
/** A push that waits longer than this at the push service is dropped: the next report replaces it. */
const TIME_TO_LIVE_SECONDS = 12 * 60 * 60;

/** What the service worker shows. */
export interface PushMessage {
  title: string;
  body: string;
  /** The same-origin path the notification opens. */
  url: string;
}

/** `gone`: the push service no longer knows the device, so its subscription is removed. */
export type PushOutcome = "sent" | "gone" | "failed";

export type PushSender = (
  subscription: DevicePushSubscription,
  message: PushMessage,
) => Promise<PushOutcome>;

/**
 * The Web Push sender with the app's VAPID keys, or null when either key
 * is not set.
 */
export function getPushSender(): PushSender | null {
  const publicKey = process.env.NEXT_PUBLIC_ASSISTANT_VAPID_PUBLIC_KEY;
  const privateKey = process.env.ASSISTANT_VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;
  return async (subscription, message) => {
    if (!isPushServiceEndpoint(subscription.endpoint)) return "gone";
    try {
      await webPush.sendNotification(subscription, JSON.stringify(message), {
        vapidDetails: { subject: VAPID_SUBJECT, publicKey, privateKey },
        TTL: TIME_TO_LIVE_SECONDS,
        urgency: "normal",
      });
      return "sent";
    } catch (error) {
      if (
        error instanceof webPush.WebPushError &&
        (error.statusCode === 404 || error.statusCode === 410)
      ) {
        return "gone";
      }
      console.error(
        "Push failed",
        error instanceof webPush.WebPushError
          ? error.statusCode
          : error instanceof Error
            ? error.message
            : error,
      );
      return "failed";
    }
  };
}
