"use client";

import * as stylex from "@stylexjs/stylex";
import { Progress } from "@tuja/ui/components/progress";
import { space } from "@tuja/ui/tokens.stylex";
import type { ComponentProps } from "react";
import progressDoc from "#src/_generated/props/progress.json";
import { defineLab } from "./define-lab.tsx";

/** A bar fills its container, and the Canvas has no width to give it. */
function SizedProgress(props: ComponentProps<typeof Progress>) {
  return (
    <div css={styles.frame}>
      <Progress {...props} />
    </div>
  );
}

const LABEL = "Upload progress";

export const ProgressLab = defineLab({
  doc: progressDoc,
  component: SizedProgress,
  variants: [
    {
      id: "default",
      label: { en: "Default", zh: "默认" },
      props: { label: LABEL, value: 60 },
    },
    {
      id: "empty",
      label: { en: "Empty", zh: "未开始" },
      props: { label: LABEL, value: 0 },
    },
    {
      id: "complete",
      label: { en: "Complete", zh: "已完成" },
      props: { label: LABEL, value: 100 },
    },
    {
      id: "steps",
      label: { en: "Steps", zh: "步骤" },
      props: { label: "Checkout", value: 3, max: 5, size: "lg" },
    },
    {
      id: "small",
      label: { en: "Small", zh: "小号" },
      props: { label: LABEL, value: 60, size: "sm" },
    },
  ],
  controls: [
    { prop: "value", range: { min: 0, max: 100 } },
    { prop: "max", range: { min: 1, max: 100 } },
    "size",
    "label",
  ],
});

const styles = stylex.create({
  frame: {
    inlineSize: space._14,
    maxInlineSize: "100%",
  },
});
