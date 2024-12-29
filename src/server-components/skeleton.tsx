import * as stylex from "@stylexjs/stylex";
import type { CSSProperties } from "react";
import { tokens } from "@/tokens.stylex";
import { skeletonTokens } from "./skeleton.stylex";

interface SkeletonProps {
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  style?: CSSProperties;
}

export function Skeleton({
  fill,
  width,
  height,
  className,
  style,
}: SkeletonProps) {
  return (
    <div
      css={[
        styles.skeleton,
        fill && styles.fill,
        !!width && styles.width(width),
        !!height && styles.height(height),
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
    animationName: pulse,
    animationDuration: "2s",
    animationTimingFunction: "cubic-bezier(.4,0,.6,1)",
    background: tokens.textMuted,
    borderRadius: "0.3rem",
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
    [skeletonTokens.width]: `${width}px`,
  }),
  height: (height: number) => ({
    [skeletonTokens.height]: `${height}px`,
  }),
});
