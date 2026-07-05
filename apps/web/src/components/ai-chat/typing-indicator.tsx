"use client";

import * as stylex from "@stylexjs/stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { motionConstants } from "@tuja/ui/primitives/motion.stylex";
import { color, font } from "@tuja/ui/tokens.stylex";

interface TypingIndicatorProps {
  label: string;
  isExiting?: boolean;
}

export function TypingIndicator({ label, isExiting }: TypingIndicatorProps) {
  return (
    <div
      role="status"
      aria-label={label}
      css={[styles.container, isExiting && styles.containerExiting]}
    >
      <span aria-hidden="true" css={styles.shimmerText}>
        {label}
      </span>
      <span css={a11y.srOnly}>{label}</span>
    </div>
  );
}

const shimmer = stylex.keyframes({
  "0%": { backgroundPosition: "200% 0" },
  "100%": { backgroundPosition: "-200% 0" },
});

const shimmerReduced = stylex.keyframes({
  "0%": { opacity: 0.4 },
  "50%": { opacity: 1 },
  "100%": { opacity: 0.4 },
});

const exitFade = stylex.keyframes({
  from: { opacity: 1 },
  to: { opacity: 0 },
});

const styles = stylex.create({
  container: {
    display: "inline-flex",
    alignItems: "center",
  },
  containerExiting: {
    animationName: exitFade,
    animationDuration: "200ms",
    animationTimingFunction: "ease-in",
    animationFillMode: "forwards",
  },
  shimmerText: {
    fontSize: font.uiBodySmall,
    backgroundImage: `linear-gradient(135deg, ${color.textMuted}, ${color.accent}, ${color.textMuted})`,
    backgroundSize: "200% 100%",
    backgroundClip: "text",
    color: "transparent",
    animationName: {
      default: shimmer,
      [motionConstants.REDUCED_MOTION]: shimmerReduced,
    },
    animationDuration: {
      default: "3s",
      [motionConstants.REDUCED_MOTION]: "2s",
    },
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
  },
});
