"use client";

import * as stylex from "@stylexjs/stylex";
import { color } from "@tuja/ui/color.stylex";
import { CodeBlock, type CodeToken } from "@tuja/ui/components/code-block";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { border, space } from "@tuja/ui/tokens.stylex";
import type { ComponentProps } from "react";
import codeBlockDoc from "#src/_generated/props/code-block.json";
import {
  BUTTON_SNIPPET_STATES,
  CODE_RUNS,
} from "#src/design-system/sections/components/code-block-specimens.tsx";
import { defineLab } from "./define-lab.tsx";
import { importLine } from "./import-parts.ts";
import type { LabSample } from "./types.ts";

const SMALLEST: readonly CodeToken[] = [
  ...importLine("Button", "@tuja/ui/components/button"),
  ["plain", "\n\n"],
  ["punct", "<"],
  ["component", "Button"],
  ["punct", ">"],
  ["plain", "Save"],
  ["punct", "</"],
  ["component", "Button"],
  ["punct", ">"],
];

const SOURCE_SAMPLES: LabSample[] = [
  {
    id: "element",
    label: { en: "An element", zh: "一个元素" },
    value: SMALLEST,
  },
  {
    id: "runs",
    label: { en: "Every kind of run", zh: "全部片段类型" },
    value: CODE_RUNS,
  },
];

const PARTS_SAMPLES: LabSample[] = [
  {
    id: "default",
    label: { en: "Button", zh: "按钮" },
    value: BUTTON_SNIPPET_STATES.default,
  },
  {
    id: "primary",
    label: { en: "Primary Button", zh: "主要按钮" },
    value: BUTTON_SNIPPET_STATES.primary,
  },
  {
    id: "primaryLarge",
    label: { en: "Primary, lg, icon", zh: "主要、大号、带图标" },
    value: BUTTON_SNIPPET_STATES.primaryLarge,
  },
];

/**
 * A code block fills its container, and the Canvas has no width to give it.
 * The block also paints the surface, so a line that overflows blurs out at
 * its edge.
 */
function SizedCodeBlock(props: ComponentProps<typeof CodeBlock>) {
  return (
    <CodeBlock
      {...props}
      css={[corner.radius_3, styles.frame]}
      contentCss={styles.content}
    />
  );
}

export const CodeBlockLab = defineLab({
  doc: codeBlockDoc,
  component: SizedCodeBlock,
  variants: [
    {
      id: "source",
      label: { en: "Static source", zh: "静态 source" },
      props: { label: "Code", source: "element" },
    },
    {
      id: "runs",
      label: { en: "Every kind of run", zh: "全部片段类型" },
      props: { label: "Code", source: "runs" },
    },
    {
      id: "parts",
      label: { en: "Parts that move", zh: "会移动的 parts" },
      props: { label: "Code", parts: "primary" },
    },
  ],
  controls: [
    "label",
    { prop: "source", samples: SOURCE_SAMPLES, replaces: ["parts"] },
    { prop: "parts", samples: PARTS_SAMPLES, replaces: ["source"] },
  ],
});

const styles = stylex.create({
  frame: {
    inlineSize: "30rem",
    maxInlineSize: "100%",
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    backgroundColor: color.bgSurface,
  },
  content: {
    padding: space._5,
  },
});
