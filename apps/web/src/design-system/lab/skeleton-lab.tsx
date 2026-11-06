"use client";

import * as stylex from "@stylexjs/stylex";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { space } from "@tuja/ui/tokens.stylex";
import type { ComponentProps } from "react";
import skeletonDoc from "#src/_generated/props/skeleton.json";
import { defineLab } from "./define-lab.tsx";

/**
 * A Skeleton without a size fills its container, and the Canvas has no size to
 * give it, so the Lab holds it in a box of a set size.
 */
function FramedSkeleton(props: ComponentProps<typeof Skeleton>) {
  return (
    <div css={styles.frame}>
      <Skeleton {...props} />
    </div>
  );
}

// These are the largest sizes that the controls give. They are equal to
// `space._14` and `space._12`, thus a Skeleton stays in its frame.
const FRAME_INLINE_PX = 320;
const FRAME_BLOCK_PX = 160;

export const SkeletonLab = defineLab({
  doc: skeletonDoc,
  component: FramedSkeleton,
  variants: [
    {
      id: "line",
      label: { en: "Line of text", zh: "一行文字" },
      props: { width: 240, height: 16 },
    },
    {
      id: "thumbnail",
      label: { en: "Thumbnail", zh: "缩略图" },
      props: { width: 64, height: 64 },
    },
    {
      id: "fill",
      label: { en: "Fill", zh: "填满" },
      props: { fill: true },
    },
    {
      id: "delayed",
      label: { en: "Delayed", zh: "延迟" },
      props: { width: 240, height: 16, delay: 600 },
    },
  ],
  controls: [
    "fill",
    {
      prop: "width",
      kind: "number",
      range: { min: 8, max: FRAME_INLINE_PX, step: 8 },
    },
    {
      prop: "height",
      kind: "number",
      range: { min: 8, max: FRAME_BLOCK_PX, step: 8 },
    },
    { prop: "delay", range: { min: 0, max: 1000, step: 50 } },
  ],
});

const styles = stylex.create({
  frame: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: space._14,
    maxInlineSize: "100%",
    blockSize: space._12,
  },
});
