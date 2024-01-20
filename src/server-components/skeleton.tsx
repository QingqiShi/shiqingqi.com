import * as stylex from "@stylexjs/stylex";
import { tokens } from "../tokens.stylex";
import type { StyleProp } from "../types";

interface SkeletonProps {
  fill?: boolean;
  width?: number;
  height?: number;
  style?: StyleProp;
}

export function Skeleton({ fill, width, height, style }: SkeletonProps) {
  return (
    <div
      {...stylex.props(
        styles.skeleton,
        fill && styles.fill,
        !!width && styles.width(width),
        !!height && styles.height(height),
        style
      )}
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
  },
  fill: {
    width: "100%",
    height: "100%",
  },
  width: (width: number) => ({
    width: `${width}px`,
  }),
  height: (height: number) => ({
    height: `${height}px`,
  }),
});
