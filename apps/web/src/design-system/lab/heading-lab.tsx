"use client";

import { Heading } from "@tuja/ui/components/heading";
import headingDoc from "#src/_generated/props/heading.json";
import { defineLab } from "./define-lab.tsx";

const TITLE = "Plan your next trip";

export const HeadingLab = defineLab({
  doc: headingDoc,
  component: Heading,
  variants: [
    {
      id: "default",
      label: { en: "Default", zh: "默认" },
      props: { children: TITLE },
    },
    {
      id: "page-title",
      label: { en: "Page title", zh: "页面标题" },
      props: { children: TITLE, level: 1 },
    },
    {
      id: "display",
      label: { en: "Display", zh: "展示" },
      props: { children: TITLE, level: 1, look: "display" },
    },
    {
      id: "small",
      label: { en: "Small", zh: "小号" },
      props: { children: TITLE, level: 3, look: "h4" },
    },
    {
      id: "bold",
      label: { en: "Bold", zh: "粗体" },
      props: { children: TITLE, weight: "bold" },
    },
  ],
  controls: ["children", "level", "look", "weight"],
});
