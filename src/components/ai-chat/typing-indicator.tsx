"use client";

import * as stylex from "@stylexjs/stylex";
import { motionConstants } from "#src/primitives/motion.stylex.ts";
import { color, font } from "#src/tokens.stylex.ts";

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
      <span css={styles.srOnly}>{label}</span>
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
    backgroundImage: `linear-gradient(135deg, ${color.textMuted}, ${color.controlActive}, ${color.textMuted})`,
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
  srOnly: {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: 0,
    margin: "-1px",
    overflow: "hidden",
    clipPath: "inset(50%)",
    whiteSpace: "nowrap",
    borderWidth: 0,
  },
});
