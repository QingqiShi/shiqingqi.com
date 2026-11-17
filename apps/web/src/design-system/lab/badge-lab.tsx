"use client";

import { t } from "@tuja/i18n";
import { Badge } from "@tuja/ui/components/badge";
import badgeDoc from "#src/_generated/props/badge.json";
import { LabCanvas } from "./lab-canvas.tsx";

export function BadgeLab() {
  const label = t({ en: "New", zh: "新" });

  return (
    <LabCanvas
      config={{
        doc: badgeDoc,
        component: Badge,
        variants: [
          {
            id: "default",
            label: { en: "Default", zh: "默认" },
            props: { children: label },
          },
          {
            id: "neutral",
            label: { en: "Neutral", zh: "中性" },
            props: { children: label, intent: "neutral" },
          },
          {
            id: "info",
            label: { en: "Info", zh: "信息" },
            props: { children: label, intent: "info" },
          },
          {
            id: "success",
            label: { en: "Success", zh: "成功" },
            props: { children: label, intent: "success" },
          },
          {
            id: "warning",
            label: { en: "Warning", zh: "警告" },
            props: { children: label, intent: "warning" },
          },
          {
            id: "destructive",
            label: { en: "Destructive", zh: "破坏性" },
            props: { children: label, intent: "destructive" },
          },
          {
            id: "primary",
            label: { en: "Primary", zh: "主要" },
            props: { children: label, intent: "primary" },
          },
        ],
        controls: ["children", "intent", "size"],
      }}
    />
  );
}
