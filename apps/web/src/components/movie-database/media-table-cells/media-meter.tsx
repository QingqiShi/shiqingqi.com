"use client";

import * as stylex from "@stylexjs/stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import type { StyleProp } from "@tuja/ui/style-prop";
import { color } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";

interface MediaMeterProps {
  /** How full the track reads, 0 to 100. */
  percent: number;
  /** The bar colour, when the neutral default does not carry the meaning. */
  fillCss?: StyleProp;
  /** The formatted value the bar sits under. */
  children: ReactNode;
}

/**
 * A formatted number with a bar under it — the shape Score and Popularity both
 * take. Only the bar colour differs between them.
 */
export function MediaMeter({ percent, fillCss, children }: MediaMeterProps) {
  return (
    <div css={styles.cell}>
      {children}
      <span
        aria-hidden="true"
        css={[
          corner.radius_round,
          styles.track,
          styles.trackFill(`${String(percent)}%`),
        ]}
      >
        <span css={[corner.radius_round, styles.fill, fillCss]} />
      </span>
    </div>
  );
}

const styles = stylex.create({
  cell: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "0.35rem",
    inlineSize: "100%",
  },
  track: {
    position: "relative",
    inlineSize: "100%",
    blockSize: "3px",
    overflow: "hidden",
    backgroundColor: color.surfaceNeutralSubtle,
  },
  trackFill: (percent: string) => ({
    "--media-meter": percent,
  }),
  fill: {
    display: "block",
    inlineSize: "var(--media-meter, 0%)",
    blockSize: "100%",
    backgroundColor: color.warning,
  },
});
