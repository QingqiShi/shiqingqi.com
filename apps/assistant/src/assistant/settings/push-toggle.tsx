"use client";

import { t } from "@tuja/i18n";
import { Callout } from "@tuja/ui/components/callout";
import { Switch } from "@tuja/ui/components/switch";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useEffect, useRef, useState } from "react";
import { assistantFetch } from "../http/assistant-fetch.ts";

type PushState =
  "checking" | "unsupported" | "denied" | "off" | "on" | "busy" | "failed";

function base64UrlToBytes(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

function isPushSupported() {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function currentSubscription() {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

/** What the switch shows on load. The worker registers in production builds only, so in development `ready` never settles and the switch gives up. */
async function readPushState(publicKey: string | null): Promise<PushState> {
  if (!publicKey || !isPushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const subscription = await Promise.race([
    currentSubscription(),
    new Promise<"timeout">((resolve) => {
      setTimeout(() => {
        resolve("timeout");
      }, 5000);
    }),
  ]);
  if (subscription === "timeout") return "unsupported";
  return subscription ? "on" : "off";
}

async function turnOn(publicKey: string) {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied" as const;
  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToBytes(publicKey),
    }));
  await assistantFetch("/api/push", {
    method: "POST",
    body: JSON.stringify(subscription.toJSON()),
  });
  return "on" as const;
}

async function turnOff() {
  const subscription = await currentSubscription();
  if (!subscription) return;
  await assistantFetch("/api/push", {
    method: "DELETE",
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
  await subscription.unsubscribe();
}

/**
 * Turns the morning report notification on or off for this device. Each device
 * subscribes on its own; iOS allows it only in the app added to the Home
 * Screen. Where the browser cannot notify or blocks it, a switch could do
 * nothing, so a notice that says how to change that takes its place.
 */
export function PushToggle({ publicKey }: { publicKey: string | null }) {
  const [state, setState] = useState<PushState>("checking");
  const noticeRef = useRef<HTMLDivElement>(null);
  const pressedRef = useRef(false);

  useEffect(() => {
    let active = true;
    readPushState(publicKey)
      .then((next) => {
        if (active) setState(next);
      })
      .catch(() => {
        if (active) setState("unsupported");
      });
    return () => {
      active = false;
    };
  }, [publicKey]);

  useEffect(() => {
    // The switch left with the focus in it. Put the focus on the notice
    // that replaced it, so that a screen reader reads why.
    if (state === "denied" && pressedRef.current) noticeRef.current?.focus();
  }, [state]);

  if (state === "unsupported" || state === "denied") {
    return (
      <div
        ref={noticeRef}
        tabIndex={-1}
        css={[a11y.focusRing, corner.radius_3]}
      >
        {state === "denied" ? (
          <Callout
            intent="info"
            role="status"
            title={t({
              en: "Notifications are blocked",
              zh: "通知已被禁止",
            })}
          >
            {t({
              en: "This browser blocks notifications from this site. Allow them in the browser’s settings, then come back to turn on the morning notification.",
              zh: "这个浏览器禁止了本网站的通知。请在浏览器设置中允许通知，再回到这里开启早间通知。",
            })}
          </Callout>
        ) : (
          <Callout
            intent="info"
            role="status"
            title={t({
              en: "This browser cannot show notifications",
              zh: "这个浏览器无法显示通知",
            })}
          >
            {t({
              en: "On iPhone and iPad, notifications work only in the app on the Home Screen: in Safari, tap Share, then Add to Home Screen, open the app from there and turn on the morning notification.",
              zh: "在 iPhone 和 iPad 上，只有添加到主屏幕的应用才能收到通知：在 Safari 中点“分享”，再点“添加到主屏幕”，然后从主屏幕打开应用，在这里开启早间通知。",
            })}
          </Callout>
        )}
      </div>
    );
  }

  return (
    <div css={stack.tight}>
      <Switch
        label={t({ en: "Morning notification", zh: "早间通知" })}
        description={t({
          en: "When the morning report is ready, this device gets a notification. On iPhone and iPad, notifications work only in the app on the Home Screen: in Safari, tap Share, then Add to Home Screen, open the app from there and turn this on.",
          zh: "晨报写好后，这台设备会收到一条通知。在 iPhone 和 iPad 上，只有添加到主屏幕的应用才能收到通知：在 Safari 中点“分享”，再点“添加到主屏幕”，然后从主屏幕打开应用并在这里开启。",
        })}
        value={state === "on" ? "on" : "off"}
        disabled={state === "checking" || state === "busy"}
        onChange={(next) => {
          if (!publicKey) return;
          pressedRef.current = true;
          setState("busy");
          (next === "on"
            ? turnOn(publicKey)
            : turnOff().then(() => "off" as const)
          )
            .then(setState)
            .catch(() => {
              setState("failed");
            });
        }}
      />
      {state === "failed" ? (
        <Callout intent="destructive" role="alert">
          {t({
            en: "That did not work. Try again.",
            zh: "没有成功，请重试。",
          })}
        </Callout>
      ) : null}
    </div>
  );
}
