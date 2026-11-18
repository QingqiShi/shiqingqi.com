"use client";

import { t } from "@tuja/i18n";
import { Switch } from "@tuja/ui/components/switch";
import switchDoc from "#src/_generated/props/switch.json";
import { LabCanvas } from "./lab-canvas.tsx";

export function SwitchLab() {
  // A bare Switch takes an `aria-label`, so each bare Variant carries one.
  const notifications = t({ en: "Notifications", zh: "通知" });

  return (
    <LabCanvas
      config={{
        doc: switchDoc,
        component: Switch,
        variants: [
          {
            id: "off",
            label: { en: "Off", zh: "关闭" },
            props: { value: "off", "aria-label": notifications },
          },
          {
            id: "on",
            label: { en: "On", zh: "开启" },
            props: { value: "on", "aria-label": notifications },
          },
          {
            id: "indeterminate",
            label: { en: "Indeterminate", zh: "未定" },
            props: { value: "indeterminate", "aria-label": notifications },
          },
          {
            id: "no-effect",
            label: { en: "No effect", zh: "无效果" },
            props: {
              value: "off",
              effect: "none",
              "aria-label": notifications,
            },
          },
          {
            id: "labelled",
            label: { en: "With a label", zh: "带标签" },
            props: {
              value: "on",
              label: notifications,
              description: t({
                en: "Get a message when your report is ready.",
                zh: "报告准备好时，给你发一条消息。",
              }),
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
      }}
    />
  );
}
