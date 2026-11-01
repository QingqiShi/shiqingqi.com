"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Switch } from "@tuja/ui/components/switch";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import { useEffect, useState } from "react";
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
 * Screen.
 */
export function PushToggle({ publicKey }: { publicKey: string | null }) {
  const [state, setState] = useState<PushState>("checking");

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

  const label = t({ en: "Morning notification", zh: "早间通知" });
  const messages: Partial<Record<PushState, string>> = {
    unsupported: t({
      en: "This browser cannot show notifications from the app.",
      zh: "这个浏览器无法显示本应用的通知。",
    }),
    denied: t({
      en: "Notifications are blocked for this site. Allow them in the browser's settings, then come back.",
      zh: "这个网站的通知已被禁止。请在浏览器设置中允许后再回来。",
    }),
    failed: t({
      en: "That did not work. Try again.",
      zh: "没有成功，请重试。",
    }),
  };
  const message = messages[state];

  return (
    <div css={stack.tight}>
      <div css={styles.row}>
        <div css={stack.text}>
          <Text weight="medium">{label}</Text>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "When the morning report is ready, this device gets a notification.",
              zh: "晨报写好后，这台设备会收到一条通知。",
            })}
          </Text>
        </div>
        <Switch
          aria-label={label}
          value={state === "on" ? "on" : "off"}
          disabled={
            state === "checking" ||
            state === "busy" ||
            state === "unsupported" ||
            state === "denied"
          }
          onChange={(next) => {
            if (!publicKey) return;
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
      </div>
      <div role="status">
        {message ? (
          <Text as="p" look="bodySmall">
            {message}
          </Text>
        ) : null}
      </div>
      <Text as="p" look="bodySmall" tone="muted">
        {t({
          en: "On iPhone and iPad, notifications work only in the app on the Home Screen: in Safari, tap Share, then Add to Home Screen, open the app from there and turn this on.",
          zh: "在 iPhone 和 iPad 上，只有添加到主屏幕的应用才能收到通知：在 Safari 中点“分享”，再点“添加到主屏幕”，然后从主屏幕打开应用并在这里开启。",
        })}
      </Text>
    </div>
  );
}

const styles = stylex.create({
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: rhythm.item,
  },
});
