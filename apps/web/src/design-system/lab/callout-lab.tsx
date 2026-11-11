"use client";

import { Callout } from "@tuja/ui/components/callout";
import calloutDoc from "#src/_generated/props/callout.json";
import { defineLab, noop } from "./define-lab.tsx";

export const CalloutLab = defineLab({
  doc: calloutDoc,
  component: Callout,
  variants: [
    {
      id: "info",
      label: { en: "Info", zh: "信息" },
      props: {
        intent: "info",
        title: "Heads up",
        children:
          "Your export keeps running in the background. We'll email you when it's ready.",
      },
    },
    {
      id: "success",
      label: { en: "Success", zh: "成功" },
      props: {
        intent: "success",
        title: "Changes saved",
        children: "Your profile is live and visible to everyone.",
      },
    },
    {
      id: "warning",
      label: { en: "Warning", zh: "警告" },
      props: {
        intent: "warning",
        title: "Storage almost full",
        children: "You're using 92% of your plan's space.",
      },
    },
    {
      id: "destructive",
      label: { en: "Destructive", zh: "破坏性" },
      props: {
        intent: "destructive",
        title: "Payment failed",
        children:
          "We couldn't charge the card ending in 4242. Update it to keep your subscription.",
      },
    },
    {
      id: "primary",
      label: { en: "Primary", zh: "主要" },
      props: {
        intent: "primary",
        title: "New in 2.0",
        children: "Segmented button groups now support leading icons.",
      },
    },
    {
      id: "neutral",
      label: { en: "Neutral", zh: "中性" },
      props: {
        intent: "neutral",
        title: "Read-only workspace",
        children: "You have view access. Ask an owner for edit rights.",
      },
    },
    {
      id: "dismissible",
      label: { en: "Dismissible", zh: "可关闭" },
      props: {
        intent: "warning",
        title: "Storage almost full",
        children: "You're using 92% of your plan's space.",
        onDismiss: noop,
        dismissLabel: "Dismiss",
      },
    },
  ],
  controls: ["title", "children", "intent"],
});
