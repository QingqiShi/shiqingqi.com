"use client";

import * as stylex from "@stylexjs/stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color } from "@tuja/ui/tokens.stylex";
import { cellShared } from "./cell-shared.stylex";
import { MediaMeter } from "./media-meter";
import { useMediaTable } from "./media-table-context";
import { toPercent } from "./to-percent";
import type { MediaCellParams } from "./types";

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
      <span
        css={[typeRole.bodySmall, typeModifier.numeric, cellShared.numeric]}
      >
        {compact.format(popularity)}
      </span>
    </MediaMeter>
  );
}

const styles = stylex.create({
  meterFillAccent: {
    backgroundColor: color.bgAccent,
  },
});
