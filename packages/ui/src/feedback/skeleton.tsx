import * as stylex from "@stylexjs/stylex";
import type { Ref } from "react";
import { color } from "../color.stylex.ts";
import { corner } from "../primitives/corner.stylex.ts";
import {
  duration,
  easing,
  motionConstants,
  motionTokens,
} from "../primitives/motion.stylex.ts";
import type { StyleProp } from "../types.ts";
import { skeletonTokens } from "./skeleton.stylex.ts";

interface SkeletonProps {
  /**
   * Stretch to fill the parent's inline and block size.
   *
   * @zh 拉伸以填满父元素的内联与块级尺寸。
   */
  fill?: boolean;
  /**
   * Inline size. A number is treated as pixels; a string is passed through
   * verbatim (e.g. `"100%"` or a token reference).
   *
   * @zh 内联尺寸。数字按像素处理；字符串按原样传入（例如 `"100%"` 或令牌引用）。
   */
  width?: string | number;
  /**
   * Block size. A number is treated as pixels; a string is passed through
   * verbatim.
   *
   * @zh 块级尺寸。数字按像素处理；字符串按原样传入。
   */
  height?: string | number;
  /**
   * The corners, by what the block stands for: `"text"` for a line of text,
   * `"control"` for a button, a field or a card, `"round"` for a pill, an
   * avatar or a dot, and `"square"` for an image that runs to the edge of
   * its box. Defaults to `"text"`.
   *
   * @zh 圆角，取决于占位块代表的东西：`"text"` 代表一行文字，`"control"` 代表按钮、输入框或卡片，`"round"` 代表胶囊、头像或圆点，`"square"` 代表铺满容器边缘的图片。默认为 `"text"`。
   */
  shape?: "text" | "control" | "round" | "square";
  /**
   * The ratio of width to height, for a block that stands for an image, such
   * as `2 / 3` for a poster. Pass it with `width` or `fill`, without `height`.
   *
   * @zh 宽高比，用于代表图片的占位块，例如海报的 `2 / 3`。与 `width` 或 `fill` 一起传入，不要再传 `height`。
   */
  aspect?: number;
  /**
   * Staggers the pulse start by N milliseconds — useful for lists of rows.
   *
   * @zh 将脉动起点错开 N 毫秒——适用于多行列表。
   */
  delay?: number;
  /**
   * StyleX overrides, composed last so a caller can win over the defaults.
   *
   * @zh StyleX 覆盖样式，最后合成，使调用方可以覆盖默认值。
   */
  css?: StyleProp;
  /**
   * Ref to the rendered element.
   *
   * @zh 指向渲染元素的 ref。
   */
  ref?: Ref<HTMLDivElement>;
}

/**
 * Loading placeholder rendered as a pulsing block sized by `fill`, `width`,
 * and `height`. The pulse is disabled under `prefers-reduced-motion`.
 */
export function Skeleton({
  fill,
  width,
  height,
  shape = "text",
  aspect,
  delay,
  css,
  ref,
}: SkeletonProps) {
  return (
    <div
      ref={ref}
      css={[
        shapeStyles[shape],
        styles.skeleton,
        fill && styles.fill,
        width !== undefined && styles.width(width),
        height !== undefined && styles.height(height),
        aspect !== undefined && styles.aspect(aspect),
        delay !== undefined && styles.delay(delay),
        css,
      ]}
    />
  );
}

const pulse = stylex.keyframes({
  "50%": {
    opacity: 0.1,
  },
});

const styles = stylex.create({
  skeleton: {
    animationName: {
      default: pulse,
      [motionConstants.REDUCED_MOTION]: "none",
    },
    animationDuration: duration._2000,
    animationTimingFunction: easing.pulse,
    animationFillMode: "both",
    animationIterationCount: "infinite",
    animationDelay: skeletonTokens.delay,
    // Inherited, so an ancestor can hold the pulse still — see `motionTokens`.
    animationPlayState: motionTokens.playState,
    backgroundColor: color.input,
    overflow: "hidden",
    opacity: 0.3,
    width: skeletonTokens.width,
    height: skeletonTokens.height,
  },
  fill: {
    [skeletonTokens.width]: "100%",
    [skeletonTokens.height]: "100%",
  },
  width: (width: string | number) => ({
    [skeletonTokens.width]:
      typeof width === "number" ? `${String(width)}px` : width,
  }),
  height: (height: string | number) => ({
    [skeletonTokens.height]:
      typeof height === "number" ? `${String(height)}px` : height,
  }),
  aspect: (aspect: number) => ({
    [skeletonTokens.height]: "auto",
    aspectRatio: aspect,
  }),
  delay: (delay: number) => ({
    [skeletonTokens.delay]: `${String(delay)}ms`,
  }),
});

const shapeStyles = {
  text: corner.radius_2,
  control: corner.radius_3,
  round: corner.radius_round,
  square: null,
};
