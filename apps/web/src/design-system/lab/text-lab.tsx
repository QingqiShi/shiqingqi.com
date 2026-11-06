"use client";

import { Text } from "@tuja/ui/components/text";
import textDoc from "#src/_generated/props/text.json";
import { defineLab } from "./define-lab.tsx";

const COPY = "Your report is ready to download.";

export const TextLab = defineLab({
  doc: textDoc,
  component: Text,
  variants: [
    {
      id: "body",
      label: { en: "Body", zh: "正文" },
      props: { children: COPY },
    },
    {
      id: "muted",
      label: { en: "Muted", zh: "弱化" },
      props: { children: COPY, look: "bodySmall", tone: "muted" },
    },
    {
      id: "label",
      label: { en: "Label", zh: "标签" },
      props: { children: "Account name", look: "label", weight: "medium" },
    },
    {
      id: "caption",
      label: { en: "Caption", zh: "说明文字" },
      props: { children: "Updated 2 minutes ago", look: "caption" },
    },
    {
      id: "overline",
      label: { en: "Overline", zh: "上标题" },
      props: { children: "New feature", look: "overline", tone: "accent" },
    },
  ],
  controls: ["children", "look", "tone", "weight", "transform", "as"],
});
