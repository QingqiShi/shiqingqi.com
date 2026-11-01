import { describe, expect, it } from "vitest";
import { isPushServiceEndpoint } from "./is-push-service-endpoint.ts";

describe("a push endpoint", () => {
  it.each([
    "https://fcm.googleapis.com/fcm/send/abc",
    "https://updates.push.services.mozilla.com/wpush/v2/abc",
    "https://web.push.apple.com/abc",
    "https://wns2-par02p.notify.windows.com/w/?token=abc",
  ])("is accepted at a browser's push service: %s", (endpoint) => {
    expect(isPushServiceEndpoint(endpoint)).toBe(true);
  });

  it.each([
    "https://169.254.169.254/latest/meta-data",
    "https://fcm.googleapis.com.example.com/fcm/send/abc",
    "https://evilpush.apple.com/abc",
    "http://fcm.googleapis.com/fcm/send/abc",
    "https://fcm.googleapis.com:8443/fcm/send/abc",
  ])("is refused anywhere else: %s", (endpoint) => {
    expect(isPushServiceEndpoint(endpoint)).toBe(false);
  });
});
