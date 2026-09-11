"use client";

import { Callout } from "@tuja/ui/components/callout";
import type { ComponentProps } from "react";
import calloutDoc from "#src/_generated/props/callout.json";
import { LabCanvas } from "../lab-canvas.tsx";
import type { LabConfig } from "../types.ts";

type CalloutLabProps = ComponentProps<typeof Callout>;

function noop() {}

const config: LabConfig<CalloutLabProps> = {
  component: "callout",
  element: "Callout",
  importPath: "@tuja/ui/components/callout",
  propsDoc: calloutDoc,
  render: (props) => <Callout {...props} />,
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
      id: "danger",
      label: { en: "Danger", zh: "危险" },
      props: {
        intent: "danger",
        title: "Payment failed",
        children:
          "We couldn't charge the card ending in 4242. Update it to keep your subscription.",
      },
    },
    {
      id: "accent",
      label: { en: "Accent", zh: "强调" },
      props: {
        intent: "accent",
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
};

/** The Callout Lab: a live Callout on the Canvas, with its API beside it. */
export function CalloutLab() {
  return <LabCanvas config={config} />;
}
