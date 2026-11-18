"use client";

import { EnvelopeSimpleIcon } from "@phosphor-icons/react/dist/ssr/EnvelopeSimple";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { TextField } from "@tuja/ui/components/text-field";
import { space } from "@tuja/ui/tokens.stylex";
import type { ComponentProps } from "react";
import textFieldDoc from "#src/_generated/props/text-field.json";
import { LabCanvas } from "./lab-canvas.tsx";
import { iconSample } from "./lab-icon-samples.tsx";
import { NONE_SAMPLE } from "./none-sample.ts";

const LEADING_SAMPLES = [
  NONE_SAMPLE,
  iconSample(
    "magnifyingGlass",
    { en: "Magnifying glass", zh: "放大镜" },
    "MagnifyingGlassIcon",
    "MagnifyingGlass",
    MagnifyingGlassIcon,
  ),
  iconSample(
    "envelope",
    { en: "Envelope", zh: "信封" },
    "EnvelopeSimpleIcon",
    "EnvelopeSimple",
    EnvelopeSimpleIcon,
  ),
];

/** A field fills its container, and the Canvas has no width to give it. */
function SizedTextField(props: ComponentProps<typeof TextField>) {
  return (
    <div css={styles.frame}>
      {/* A field reads defaultValue only when it mounts. Thus a Variant
          with a different value must mount a new field. */}
      <TextField key={String(props.defaultValue)} {...props} />
    </div>
  );
}

export function TextFieldLab() {
  const email = t({ en: "Email", zh: "电子邮箱" });
  const step = t({ en: "Step", zh: "步骤" });

  return (
    <LabCanvas
      config={{
        doc: textFieldDoc,
        component: SizedTextField,
        variants: [
          {
            id: "default",
            label: { en: "Default", zh: "默认" },
            props: { label: email, placeholder: "you@example.com" },
          },
          {
            id: "description",
            label: { en: "With a description", zh: "带说明" },
            props: {
              label: email,
              placeholder: "you@example.com",
              description: t({
                en: "We send the receipt to this address.",
                zh: "收据会发送到这个邮箱。",
              }),
            },
          },
          {
            id: "error",
            label: { en: "With an error", zh: "带错误" },
            props: {
              label: email,
              error: t({
                en: "Enter an email address.",
                zh: "请输入电子邮箱地址。",
              }),
            },
          },
          {
            id: "search",
            label: { en: "Search", zh: "搜索" },
            props: {
              label: t({ en: "Search", zh: "搜索" }),
              labelHidden: true,
              placeholder: t({ en: "Search reports", zh: "搜索报告" }),
              leading: "magnifyingGlass",
            },
          },
          {
            id: "ghost",
            label: { en: "Ghost", zh: "无框" },
            props: {
              label: step,
              labelHidden: true,
              look: "ghost",
              defaultValue: t({
                en: "Book the table for Friday",
                zh: "订好周五的餐桌",
              }),
            },
          },
          {
            id: "muted",
            label: { en: "Muted", zh: "弱化" },
            props: {
              label: step,
              labelHidden: true,
              look: "ghost",
              tone: "muted",
              defaultValue: t({ en: "Send the invitations", zh: "发出邀请" }),
            },
          },
          {
            id: "disabled",
            label: { en: "Disabled", zh: "禁用" },
            props: {
              label: email,
              placeholder: "you@example.com",
              disabled: true,
            },
          },
        ],
        controls: [
          "label",
          "placeholder",
          "description",
          "error",
          "look",
          "tone",
          "size",
          { prop: "leading", samples: LEADING_SAMPLES },
          "labelHidden",
          "required",
          "disabled",
        ],
      }}
    />
  );
}

const styles = stylex.create({
  frame: {
    inlineSize: space._14,
    maxInlineSize: "100%",
  },
});
