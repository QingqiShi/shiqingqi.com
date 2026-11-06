"use client";

import { InfoIcon } from "@phosphor-icons/react/dist/ssr/Info";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { Popover } from "@tuja/ui/components/popover";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { measure } from "@tuja/ui/tokens.stylex";
import type { ComponentProps } from "react";
import popoverDoc from "#src/_generated/props/popover.json";
import { defineLab } from "./define-lab.tsx";
import { labSource } from "./print-lab-value.ts";
import type { LabSample } from "./types.ts";

type Trigger = ComponentProps<typeof Popover>["trigger"];

const panel = stylex.create({
  narrow: { maxInlineSize: measure.short },
});

const CONTENT_SAMPLES: LabSample[] = [
  {
    id: "text",
    label: { en: "Text", zh: "文本" },
    value: labSource(
      <div css={[stack.text, panel.narrow]}>
        <Text as="span" look="bodySmall" weight="semibold">
          Repayment threshold
        </Text>
        <Text look="caption" tone="muted">
          You repay 9% of what you earn above this figure. It rises each April.
        </Text>
      </div>,
    ),
  },
  {
    id: "form",
    label: { en: "Form", zh: "表单" },
    value: labSource(
      <div css={stack.item}>
        <TextField label="Name" size="sm" />
        <Button size="sm">Rename</Button>
      </div>,
    ),
  },
];

export const PopoverLab = defineLab({
  doc: popoverDoc,
  component: Popover,
  variants: [
    {
      id: "text",
      label: { en: "Text", zh: "文本" },
      props: {
        trigger: labSource<Trigger>((triggerProps) => (
          <Button {...triggerProps}>Details</Button>
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
            aria-label="About the threshold"
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
          <Button {...triggerProps}>Rename</Button>
        )),
        children: "form",
      },
    },
    {
      id: "top",
      label: { en: "Above", zh: "上方" },
      props: {
        trigger: labSource<Trigger>((triggerProps) => (
          <Button {...triggerProps}>Details</Button>
        )),
        children: "text",
        placement: "top",
      },
    },
  ],
  controls: [
    { prop: "children", samples: CONTENT_SAMPLES },
    "placement",
    { prop: "offset", range: { min: 0, max: 32 } },
  ],
});
