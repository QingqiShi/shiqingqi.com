"use client";

import * as stylex from "@stylexjs/stylex";
import { Textarea } from "@tuja/ui/components/textarea";
import { space } from "@tuja/ui/tokens.stylex";
import type { ComponentProps } from "react";
import textareaDoc from "#src/_generated/props/textarea.json";
import { defineLab } from "./define-lab.tsx";

/** A field fills its container, and the Canvas has no width to give it. */
function SizedTextarea(props: ComponentProps<typeof Textarea>) {
  return (
    <div css={styles.frame}>
      <Textarea {...props} />
    </div>
  );
}

const PLACEHOLDER = "What went well this week?";

export const TextareaLab = defineLab({
  doc: textareaDoc,
  component: SizedTextarea,
  variants: [
    {
      id: "default",
      label: { en: "Default", zh: "默认" },
      props: { label: "Notes", placeholder: PLACEHOLDER },
    },
    {
      id: "auto-grow",
      label: { en: "Auto grow", zh: "自动增高" },
      props: { label: "Notes", placeholder: PLACEHOLDER, autoGrow: true },
    },
    {
      id: "description",
      label: { en: "With a description", zh: "带说明" },
      props: {
        label: "Notes",
        placeholder: PLACEHOLDER,
        description: "Only you can see these.",
      },
    },
    {
      id: "error",
      label: { en: "With an error", zh: "带错误" },
      props: { label: "Notes", error: "Write at least one line." },
    },
    {
      id: "disabled",
      label: { en: "Disabled", zh: "禁用" },
      props: { label: "Notes", placeholder: PLACEHOLDER, disabled: true },
    },
  ],
  controls: [
    "label",
    "placeholder",
    "description",
    "error",
    "size",
    "autoGrow",
    "labelHidden",
    "disabled",
  ],
});

const styles = stylex.create({
  frame: {
    inlineSize: space._14,
    maxInlineSize: "100%",
  },
});
