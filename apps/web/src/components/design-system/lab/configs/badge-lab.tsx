"use client";

import { Badge } from "@tuja/ui/components/badge";
import type { ComponentProps } from "react";
import badgeDoc from "#src/_generated/props/badge.json";
import { LabCanvas } from "../lab-canvas.tsx";
import type { LabConfig } from "../types.ts";

type BadgeLabProps = ComponentProps<typeof Badge>;

// The label a Variant puts on the Specimen stays in English: it is printed in
// the snippet as source, where a translated string would not be what a
// consumer writes.
const LABEL = "New";

const config: LabConfig<BadgeLabProps> = {
  component: "badge",
  element: "Badge",
  importPath: "@tuja/ui/components/badge",
  propsDoc: badgeDoc,
  render: (props) => <Badge {...props} />,
  variants: [
    {
      id: "default",
      label: { en: "Default", zh: "默认" },
      props: { children: LABEL },
    },
    {
      id: "neutral",
      label: { en: "Neutral", zh: "中性" },
      props: { children: LABEL, intent: "neutral" },
    },
    {
      id: "info",
      label: { en: "Info", zh: "信息" },
      props: { children: LABEL, intent: "info" },
    },
    {
      id: "success",
      label: { en: "Success", zh: "成功" },
      props: { children: LABEL, intent: "success" },
    },
    {
      id: "warning",
      label: { en: "Warning", zh: "警告" },
      props: { children: LABEL, intent: "warning" },
    },
    {
      id: "danger",
      label: { en: "Danger", zh: "危险" },
      props: { children: LABEL, intent: "danger" },
    },
    {
      id: "accent",
      label: { en: "Accent", zh: "强调" },
      props: { children: LABEL, intent: "accent" },
    },
  ],
  controls: ["children", "intent", "size"],
};

/** The Badge Lab: a live Badge on the Canvas, with its API beside it. */
export function BadgeLab() {
  return <LabCanvas config={config} />;
}
