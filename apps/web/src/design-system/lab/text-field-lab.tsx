"use client";

import { EnvelopeSimpleIcon } from "@phosphor-icons/react/dist/ssr/EnvelopeSimple";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import * as stylex from "@stylexjs/stylex";
import { TextField } from "@tuja/ui/components/text-field";
import { space } from "@tuja/ui/tokens.stylex";
import type { ComponentProps } from "react";
import textFieldDoc from "#src/_generated/props/text-field.json";
import { defineLab, NONE_SAMPLE } from "./define-lab.tsx";
import { iconSample } from "./lab-icon-samples.tsx";

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
      <TextField {...props} />
    </div>
  );
}

export const TextFieldLab = defineLab({
  doc: textFieldDoc,
  component: SizedTextField,
  variants: [
    {
      id: "default",
      label: { en: "Default", zh: "默认" },
      props: { label: "Email", placeholder: "you@example.com" },
    },
    {
      id: "description",
      label: { en: "With a description", zh: "带说明" },
      props: {
        label: "Email",
        placeholder: "you@example.com",
        description: "We send the receipt here.",
      },
    },
    {
      id: "error",
      label: { en: "With an error", zh: "带错误" },
      props: { label: "Email", error: "Enter an email address." },
    },
    {
      id: "search",
      label: { en: "Search", zh: "搜索" },
      props: {
        label: "Search",
        labelHidden: true,
        placeholder: "Search reports",
        leading: "magnifyingGlass",
      },
    },
    {
      id: "disabled",
      label: { en: "Disabled", zh: "禁用" },
      props: { label: "Email", placeholder: "you@example.com", disabled: true },
    },
  ],
  controls: [
    "label",
    "placeholder",
    "description",
    "error",
    "size",
    { prop: "leading", samples: LEADING_SAMPLES },
    "labelHidden",
    "required",
    "disabled",
  ],
});

const styles = stylex.create({
  frame: {
    inlineSize: space._14,
    maxInlineSize: "100%",
  },
});
