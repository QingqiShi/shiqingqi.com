import * as stylex from "@stylexjs/stylex";
import type { CSSProperties, Ref } from "react";
import { motionConstants } from "#src/primitives/motion.stylex.ts";
import { border, color } from "#src/tokens.stylex.ts";
import { skeletonTokens } from "./skeleton.stylex";

interface SkeletonProps {
  fill?: boolean;
  width?: number;
  height?: number;
  delay?: number;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
}

export function Skeleton({
  fill,
  width,
  height,
  delay,
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
        !!width && styles.width(width),
        !!height && styles.height(height),
        !!delay && styles.delay(delay),
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
  width: (width: number) => ({
    [skeletonTokens.width]: `${String(width)}px`,
  }),
  height: (height: number) => ({
    [skeletonTokens.height]: `${String(height)}px`,
  }),
  delay: (delay: number) => ({
    [skeletonTokens.delay]: `${String(delay)}ms`,
  }),
});
