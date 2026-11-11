"use client";

import { Button } from "@tuja/ui/components/button";
import buttonDoc from "#src/_generated/props/button.json";
import { defineLab } from "./define-lab.tsx";
import { labIconSamples } from "./lab-icon-samples.tsx";

// The label a Variant puts on the Specimen stays in English: it is printed in
// the snippet as source, where a translated string would not be what a
// consumer writes.
const LABEL = "Save changes";

export const ButtonLab = defineLab({
  doc: buttonDoc,
  component: Button,
  variants: [
    {
      id: "primary",
      label: { en: "Primary", zh: "主要" },
      props: { children: LABEL, look: "primary" },
    },
    {
      id: "default",
      label: { en: "Default", zh: "默认" },
      props: { children: LABEL },
    },
    {
      id: "outline",
      label: { en: "Outline", zh: "描边" },
      props: { children: LABEL, look: "outline" },
    },
    {
      id: "ghost",
      label: { en: "Ghost", zh: "无框" },
      props: { children: LABEL, look: "ghost" },
    },
    {
      id: "destructive",
      label: { en: "Destructive", zh: "破坏性" },
      props: { children: "Delete", look: "destructive", icon: "trash" },
    },
    {
      id: "dangerIntent",
      label: { en: "Destructive intent", zh: "破坏性意图" },
      props: { children: "Delete", look: "outline", intent: "destructive" },
    },
    {
      id: "bleed",
      label: { en: "Bleed", zh: "越过边缘" },
      props: {
        children: "All reports",
        look: "ghost",
        size: "sm",
        bleed: "start",
      },
    },
    {
      id: "link",
      label: { en: "Link", zh: "链接" },
      props: { children: LABEL, href: "#" },
    },
    {
      id: "filter",
      label: { en: "Filter", zh: "筛选项" },
      props: {
        children: "Watchlist",
        size: "xs",
        look: "outline",
        isActive: true,
        trailing: "12",
      },
    },
    {
      id: "iconOnly",
      label: { en: "Icon only", zh: "纯图标" },
      props: { icon: "plus", "aria-label": "Add item" },
    },
    {
      id: "busy",
      label: { en: "Busy", zh: "忙碌" },
      props: { children: "Saving", loading: true },
    },
  ],
  controls: [
    "children",
    "look",
    "intent",
    "size",
    { prop: "icon", samples: labIconSamples },
    "trailing",
    "isActive",
    "loading",
    "bleed",
    "hideLabelOnMobile",
    "disabled",
  ],
});
