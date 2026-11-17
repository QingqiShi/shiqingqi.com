"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { popoverSurface } from "@tuja/ui/components/popover-surface.stylex";
import { ProgressiveBlur } from "@tuja/ui/components/progressive-blur";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm, space } from "@tuja/ui/tokens.stylex";
import progressiveBlurDoc from "#src/_generated/props/progressive-blur.json";
import { LabCanvas } from "./lab-canvas.tsx";
import { labSource } from "./print-lab-value.ts";
import type { LabSample } from "./types.ts";

const dialog = stylex.create({
  centred: {
    position: "absolute",
    insetBlockStart: "50%",
    insetInlineStart: "50%",
    transform: "translate(-50%, -50%)",
    display: "flex",
    flexDirection: "column",
    gap: rhythm.item,
    inlineSize: "min(20rem, 80%)",
    padding: space._5,
  },
  actions: {
    justifyContent: "flex-end",
  },
});

const popup = stylex.create({
  corner: {
    position: "absolute",
    insetBlockStart: space._4,
    insetInlineEnd: space._4,
    display: "flex",
    flexDirection: "column",
    inlineSize: "10rem",
    padding: space._2,
  },
});

export function ProgressiveBlurLab() {
  const keepEditing = t({ en: "Keep editing", zh: "继续编辑" });

  const floatingSamples: LabSample[] = [
    {
      id: "dialog",
      label: { en: "Dialog", zh: "对话框" },
      value: labSource(
        <div css={[popoverSurface.base, dialog.centred]}>
          <div css={stack.text}>
            <Text look="bodySmall" weight="semibold">
              {t({ en: "Discard three edits?", zh: "放弃三处修改？" })}
            </Text>
            <Text look="bodySmall" tone="muted">
              {t({
                en: "The shared copy keeps the version from Tuesday.",
                zh: "共享副本将保留周二的版本。",
              })}
            </Text>
          </div>
          <div css={[cluster.tight, dialog.actions]}>
            <Button size="sm">{keepEditing}</Button>
            <Button size="sm">{t({ en: "Discard", zh: "放弃" })}</Button>
          </div>
        </div>,
      ),
    },
    {
      id: "popup",
      label: { en: "Popup", zh: "弹层" },
      value: labSource(
        <div css={[popoverSurface.base, popup.corner]}>
          <Button size="sm" look="ghost">
            {t({ en: "Newest first", zh: "最新在前" })}
          </Button>
          <Button size="sm" look="ghost">
            {t({ en: "Highest rated", zh: "评分最高" })}
          </Button>
          <Button size="sm" look="ghost">
            {t({ en: "Title A to Z", zh: "按标题排序" })}
          </Button>
        </div>,
      ),
    },
  ];

  return (
    <LabCanvas
      config={{
        doc: progressiveBlurDoc,
        component: ProgressiveBlur,
        scene: "backdrop",
        variants: [
          {
            id: "dialog",
            label: { en: "Around a dialog", zh: "对话框周围" },
            props: { children: "dialog" },
          },
          {
            id: "reach",
            label: { en: "With a reach", zh: "限定范围" },
            props: { children: "popup", reach: 96, radius: 12 },
          },
          {
            id: "soft",
            label: { en: "Soft", zh: "轻柔" },
            props: { children: "dialog", radius: 6 },
          },
          {
            id: "hidden",
            label: { en: "Hidden", zh: "隐藏" },
            props: { children: "dialog", isShown: false },
          },
        ],
        controls: [
          { prop: "children", samples: floatingSamples },
          { prop: "radius", range: { min: 0, max: 32 } },
          "isShown",
          { prop: "reach", range: { min: 0, max: 160, step: 8 } },
        ],
      }}
    />
  );
}
