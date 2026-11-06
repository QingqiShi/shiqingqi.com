"use client";

import { Switch } from "@tuja/ui/components/switch";
import switchDoc from "#src/_generated/props/switch.json";
import { defineLab } from "./define-lab.tsx";

// A bare Switch takes an `aria-label`, so each bare Variant carries one.
const ARIA_LABEL = "Notifications";

export const SwitchLab = defineLab({
  doc: switchDoc,
  component: Switch,
  variants: [
    {
      id: "off",
      label: { en: "Off", zh: "关闭" },
      props: { value: "off", "aria-label": ARIA_LABEL },
    },
    {
      id: "on",
      label: { en: "On", zh: "开启" },
      props: { value: "on", "aria-label": ARIA_LABEL },
    },
    {
      id: "indeterminate",
      label: { en: "Indeterminate", zh: "未定" },
      props: { value: "indeterminate", "aria-label": ARIA_LABEL },
    },
    {
      id: "no-effect",
      label: { en: "No effect", zh: "无效果" },
      props: { value: "off", effect: "none", "aria-label": ARIA_LABEL },
    },
    {
      id: "labelled",
      label: { en: "With a label", zh: "带标签" },
      props: {
        value: "on",
        label: "Notifications",
        description: "Get a message when your report is ready.",
      },
    },
  ],
  controls: ["size", "value", "effect", "disabled"],
  state: {
    prop: "value",
    handler: "onChange",
    type: {
      code: "SwitchState",
      imports: [
        {
          name: "SwitchState",
          from: "@tuja/ui/components/switch",
          isType: true,
        },
      ],
    },
  },
});
