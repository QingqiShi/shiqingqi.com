import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";
import type { CSSProperties, Ref } from "react";
import { motionConstants } from "../primitives/motion.stylex.ts";
import { border, color } from "../tokens.stylex.ts";
import { skeletonTokens } from "./skeleton.stylex.ts";

interface SkeletonProps {
  /** Stretch to fill the parent's inline and block size. */
  fill?: boolean;
  /**
   * Inline size. A number is treated as pixels; a string is passed through
   * verbatim (e.g. `"100%"` or a token reference).
   */
  width?: string | number;
  /**
   * Block size. A number is treated as pixels; a string is passed through
   * verbatim.
   */
  height?: string | number;
  /** Staggers the pulse start by N milliseconds — useful for lists of rows. */
  delay?: number;
  /** StyleX overrides, composed last so a caller can win over the defaults. */
  css?: StyleXStyles;
  /** Escape-hatch class applied to the rendered element. */
  className?: string;
  /** Inline style applied to the rendered element. */
  style?: CSSProperties;
  /** Ref to the rendered element. */
  ref?: Ref<HTMLDivElement>;
}

/**
 * Loading placeholder. Renders a pulsing block sized by `fill`, `width`, and
 * `height`; the pulse is disabled under `prefers-reduced-motion`. Stagger a row
 * of skeletons with `delay`.
 */
export function Skeleton({
  fill,
  width,
  height,
  delay,
  css,
  className,
  style,
  ref,
}: SkeletonProps) {
  return (
    <div
      ref={ref}
      css={[
        styles.skeleton,
        fill && styles.fill,
        width !== undefined && styles.width(width),
        height !== undefined && styles.height(height),
        delay !== undefined && styles.delay(delay),
        css,
      ]}
      className={className}
      style={style}
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
    animationDuration: "2s",
    animationTimingFunction: "cubic-bezier(.4,0,.6,1)",
    animationFillMode: "both",
    animationIterationCount: "infinite",
    animationDelay: skeletonTokens.delay,
    backgroundColor: color.textMuted,
    borderRadius: border.radius_2,
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
  delay: (delay: number) => ({
    [skeletonTokens.delay]: `${String(delay)}ms`,
  }),
});
