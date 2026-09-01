"use client";

import * as stylex from "@stylexjs/stylex";
import { color, font } from "@tuja/ui/tokens.stylex";
import { useMediaTable } from "../media-table-context";
import type { MediaCellParams } from "../media-table-spec";
import { cellShared } from "./cell-shared.stylex";
import { MediaMeter } from "./media-meter";
import { toPercent } from "./to-percent";

/** Rating out of 10 above which a score reads as "good". */
const SCORE_GOOD = 7;
/** Rating below which a score reads as "poor". */
const SCORE_POOR = 5;

export function MediaScoreCell({ api, row }: MediaCellParams) {
  const { rating } = useMediaTable();

  if (!api.rowIsLeaf(row)) return null;
  const score = row.data.rating;
  if (typeof score !== "number" || score <= 0) {
    return <span css={cellShared.empty}>—</span>;
  }

  return (
    <MediaMeter
      percent={toPercent(score, 10)}
      fillCss={[
        score >= SCORE_GOOD && styles.meterFillGood,
        score < SCORE_POOR && styles.meterFillPoor,
      ]}
    >
      <span css={styles.scoreValue}>{rating.format(score)}</span>
    </MediaMeter>
  );
}

const styles = stylex.create({
  meterFillGood: {
    backgroundColor: color.success,
  },
  meterFillPoor: {
    backgroundColor: color.danger,
  },
  scoreValue: {
    color: color.textMain,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    fontVariantNumeric: "tabular-nums",
  },
});
