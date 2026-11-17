"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Progress } from "@tuja/ui/components/progress";
import { space } from "@tuja/ui/tokens.stylex";
import type { ComponentProps } from "react";
import progressDoc from "#src/_generated/props/progress.json";
import { LabCanvas } from "./lab-canvas.tsx";

/** A bar fills its container, and the Canvas has no width to give it. */
function SizedProgress(props: ComponentProps<typeof Progress>) {
  return (
    <div css={styles.frame}>
      <Progress {...props} />
    </div>
  );
}

export function ProgressLab() {
  const label = t({ en: "Upload progress", zh: "上传进度" });

  return (
    <LabCanvas
      config={{
        doc: progressDoc,
        component: SizedProgress,
        variants: [
          {
            id: "default",
            label: { en: "Default", zh: "默认" },
            props: { label, value: 60 },
          },
          {
            id: "empty",
            label: { en: "Empty", zh: "未开始" },
            props: { label, value: 0 },
          },
          {
            id: "complete",
            label: { en: "Complete", zh: "已完成" },
            props: { label, value: 100 },
          },
          {
            id: "steps",
            label: { en: "Steps", zh: "步骤" },
            props: {
              label: t({ en: "Checkout", zh: "结账流程" }),
              value: 3,
              max: 5,
              size: "lg",
            },
          },
          {
            id: "small",
            label: { en: "Small", zh: "小号" },
            props: { label, value: 60, size: "sm" },
          },
        ],
        controls: [
          { prop: "value", range: { min: 0, max: 100 } },
          { prop: "max", range: { min: 1, max: 100 } },
          "size",
          "label",
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
