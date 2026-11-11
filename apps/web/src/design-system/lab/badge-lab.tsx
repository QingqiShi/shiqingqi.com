"use client";

import { Badge } from "@tuja/ui/components/badge";
import badgeDoc from "#src/_generated/props/badge.json";
import { defineLab } from "./define-lab.tsx";

// The label a Variant puts on the Specimen stays in English: it is printed in
// the snippet as source, where a translated string would not be what a
// consumer writes.
const LABEL = "New";

export const BadgeLab = defineLab({
  doc: badgeDoc,
  component: Badge,
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
      id: "destructive",
      label: { en: "Destructive", zh: "破坏性" },
      props: { children: LABEL, intent: "destructive" },
    },
    {
      id: "primary",
      label: { en: "Primary", zh: "主要" },
      props: { children: LABEL, intent: "primary" },
    },
  ],
  controls: ["children", "intent", "size"],
});
