"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Textarea } from "@tuja/ui/components/textarea";
import { space } from "@tuja/ui/tokens.stylex";
import type { ComponentProps } from "react";
import textareaDoc from "#src/_generated/props/textarea.json";
import { LabCanvas } from "./lab-canvas.tsx";

/** A field fills its container, and the Canvas has no width to give it. */
function SizedTextarea(props: ComponentProps<typeof Textarea>) {
  return (
    <div css={styles.frame}>
      {/* A field reads defaultValue only when it mounts. Thus a Variant
          with a different value must mount a new field. */}
      <Textarea key={String(props.defaultValue)} {...props} />
    </div>
  );
}

export function TextareaLab() {
  const notes = t({ en: "Notes", zh: "备注" });
  const step = t({ en: "Step", zh: "步骤" });
  const placeholder = t({
    en: "What went well this week?",
    zh: "这周有哪些顺利的事？",
  });

  return (
    <LabCanvas
      config={{
        doc: textareaDoc,
        component: SizedTextarea,
        variants: [
          {
            id: "default",
            label: { en: "Default", zh: "默认" },
            props: { label: notes, placeholder },
          },
          {
            id: "auto-grow",
            label: { en: "Auto grow", zh: "自动增高" },
            props: { label: notes, placeholder, autoGrow: true },
          },
          {
            id: "description",
            label: { en: "With a description", zh: "带说明" },
            props: {
              label: notes,
              placeholder,
              description: t({
                en: "Only you can see these.",
                zh: "只有你能看到这些备注。",
              }),
            },
          },
          {
            id: "error",
            label: { en: "With an error", zh: "带错误" },
            props: {
              label: notes,
              error: t({
                en: "Write at least one line.",
                zh: "请至少写一行。",
              }),
            },
          },
          {
            id: "ghost",
            label: { en: "Ghost", zh: "无框" },
            props: {
              label: step,
              labelHidden: true,
              look: "ghost",
              rows: 1,
              autoGrow: true,
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
              rows: 1,
              autoGrow: true,
              defaultValue: t({ en: "Send the invitations", zh: "发出邀请" }),
            },
          },
          {
            id: "disabled",
            label: { en: "Disabled", zh: "禁用" },
            props: { label: notes, placeholder, disabled: true },
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
          "autoGrow",
          "labelHidden",
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
