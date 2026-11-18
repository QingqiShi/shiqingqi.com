"use client";

import { InfoIcon } from "@phosphor-icons/react/dist/ssr/Info";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Popover } from "@tuja/ui/components/popover";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { measure } from "@tuja/ui/tokens.stylex";
import type { ComponentProps } from "react";
import popoverDoc from "#src/_generated/props/popover.json";
import { LabCanvas } from "./lab-canvas.tsx";
import { labSource } from "./print-lab-value.ts";
import type { LabSample } from "./types.ts";

type Trigger = ComponentProps<typeof Popover>["trigger"];

const panel = stylex.create({
  narrow: { maxInlineSize: measure.short },
});

export function PopoverLab() {
  const details = t({ en: "Details", zh: "详情" });
  const rename = t({ en: "Rename", zh: "重命名" });
  const aboutThreshold = t({ en: "About the threshold", zh: "关于起征点" });

  const contentSamples: LabSample[] = [
    {
      id: "text",
      label: { en: "Text", zh: "文本" },
      value: labSource(
        <div css={[stack.text, panel.narrow]}>
          <Text as="span" look="bodySmall" weight="semibold">
            {t({ en: "Repayment threshold", zh: "还款起征点" })}
          </Text>
          <Text look="caption" tone="muted">
            {t({
              en: "You repay 9% of what you earn above this figure. It rises each April.",
              zh: "收入超过这个数额的部分，你需偿还其中的 9%。该数额每年四月上调。",
            })}
          </Text>
        </div>,
      ),
    },
    {
      id: "form",
      label: { en: "Form", zh: "表单" },
      value: labSource(
        <div css={stack.item}>
          <TextField label={t({ en: "Name", zh: "名称" })} size="sm" />
          <Button size="sm">{rename}</Button>
        </div>,
      ),
    },
  ];

  return (
    <LabCanvas
      config={{
        doc: popoverDoc,
        component: Popover,
        variants: [
          {
            id: "text",
            label: { en: "Text", zh: "文本" },
            props: {
              trigger: labSource<Trigger>((triggerProps) => (
                <Button {...triggerProps}>{details}</Button>
              )),
              children: "text",
            },
          },
          {
            id: "icon",
            label: { en: "Icon trigger", zh: "图标触发" },
            props: {
              trigger: labSource<Trigger>((triggerProps) => (
                <Button
                  {...triggerProps}
                  look="ghost"
                  icon={<InfoIcon weight="bold" />}
                  aria-label={aboutThreshold}
                />
              )),
              children: "text",
            },
          },
          {
            id: "form",
            label: { en: "Form", zh: "表单" },
            props: {
              trigger: labSource<Trigger>((triggerProps) => (
                <Button {...triggerProps}>{rename}</Button>
              )),
              children: "form",
            },
          },
          {
            id: "top",
            label: { en: "Above", zh: "上方" },
            props: {
              trigger: labSource<Trigger>((triggerProps) => (
                <Button {...triggerProps}>{details}</Button>
              )),
              children: "text",
              placement: "top",
            },
          },
        ],
        controls: [
          { prop: "children", samples: contentSamples },
          "placement",
          { prop: "offset", range: { min: 0, max: 32 } },
        ],
      }}
    />
  );
}
