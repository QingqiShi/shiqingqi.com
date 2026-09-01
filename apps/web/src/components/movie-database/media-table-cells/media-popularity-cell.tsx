"use client";

import * as stylex from "@stylexjs/stylex";
import { color } from "@tuja/ui/tokens.stylex";
import { useMediaTable } from "../media-table-context";
import type { MediaCellParams } from "../media-table-spec";
import { cellShared } from "./cell-shared.stylex";
import { MediaMeter } from "./media-meter";
import { toPercent } from "./to-percent";

export function MediaPopularityCell({ api, row }: MediaCellParams) {
  const { compact, maxPopularity } = useMediaTable();

  if (!api.rowIsLeaf(row)) return null;
  const popularity = row.data.popularity;
  if (typeof popularity !== "number")
    return <span css={cellShared.empty}>—</span>;

  return (
    <MediaMeter
      percent={toPercent(popularity, maxPopularity)}
      fillCss={styles.meterFillAccent}
    >
      <span css={cellShared.numeric}>{compact.format(popularity)}</span>
    </MediaMeter>
  );
}

const styles = stylex.create({
  meterFillAccent: {
    backgroundColor: color.accent,
  },
});
