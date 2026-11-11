"use client";

import * as stylex from "@stylexjs/stylex";
import { Progress } from "@tuja/ui/components/progress";
import { rhythm } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";

interface MediaMeterProps {
  /** How full the track reads, 0 to 100. */
  percent: number;
  /** The name of the column, for the bar. */
  label: string;
  /** The meaning of the level, when it has one. */
  intent?: "success" | "destructive";
  /** The formatted value the bar sits under. */
  children: ReactNode;
}

/**
 * A formatted number with a bar under it — the shape Score and Popularity both
 * take.
 */
export function MediaMeter({
  percent,
  label,
  intent,
  children,
}: MediaMeterProps) {
  return (
    <div css={styles.cell}>
      {children}
      <Progress
        value={percent}
        label={label}
        size="sm"
        intent={intent}
        aria-hidden="true"
      />
    </div>
  );
}

const styles = stylex.create({
  cell: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: rhythm.tight,
    inlineSize: "100%",
  },
});
