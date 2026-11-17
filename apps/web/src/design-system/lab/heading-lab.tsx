"use client";

import { t } from "@tuja/i18n";
import { Heading } from "@tuja/ui/components/heading";
import headingDoc from "#src/_generated/props/heading.json";
import { LabCanvas } from "./lab-canvas.tsx";

export function HeadingLab() {
  const title = t({ en: "Plan your next trip", zh: "规划你的下一次旅行" });

  return (
    <LabCanvas
      config={{
        doc: headingDoc,
        component: Heading,
        variants: [
          {
            id: "default",
            label: { en: "Default", zh: "默认" },
            props: { children: title },
          },
          {
            id: "page-title",
            label: { en: "Page title", zh: "页面标题" },
            props: { children: title, level: 1 },
          },
          {
            id: "display",
            label: { en: "Display", zh: "展示" },
            props: { children: title, level: 1, look: "display" },
          },
          {
            id: "small",
            label: { en: "Small", zh: "小号" },
            props: { children: title, level: 3, look: "h4" },
          },
          {
            id: "bold",
            label: { en: "Bold", zh: "粗体" },
            props: { children: title, weight: "bold" },
          },
        ],
        controls: ["children", "level", "look", "weight"],
      }}
    />
  );
}
