"use client";

import * as stylex from "@stylexjs/stylex";
import { flex } from "#src/primitives/flex.stylex.ts";
import { color, font, space } from "#src/tokens.stylex.ts";

const DOT_COUNT = 3;
const DOT_DELAY_MS = 160;

interface TypingIndicatorProps {
  label: string;
}

export function TypingIndicator({ label }: TypingIndicatorProps) {
  return (
    <div role="status" aria-label={label} css={[flex.row, styles.container]}>
      {Array.from({ length: DOT_COUNT }, (_, i) => (
        <span
          key={i}
          css={styles.dot}
          style={{ animationDelay: `${i * DOT_DELAY_MS}ms` }}
        />
      ))}
      <span css={styles.label}>{label}</span>
    </div>
  );
}

const bounce = stylex.keyframes({
  "0%, 80%, 100%": { opacity: 0.3, transform: "scale(0.8)" },
  "40%": { opacity: 1, transform: "scale(1)" },
});

const styles = stylex.create({
  container: {
    gap: space._1,
    paddingBlock: space._1,
  },
  dot: {
    width: "0.375rem",
    height: "0.375rem",
    borderRadius: "50%",
    backgroundColor: color.textMuted,
    animationName: bounce,
    animationDuration: "1.4s",
    animationTimingFunction: "ease-in-out",
    animationIterationCount: "infinite",
    animationFillMode: "both",
  },
  label: {
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    marginLeft: space._1,
  },
});
