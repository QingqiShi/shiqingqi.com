"use client";

import * as stylex from "@stylexjs/stylex";
import { truncate } from "@tuja/ui/primitives/layout.stylex";
import { color, font } from "@tuja/ui/tokens.stylex";
import type { MediaCellParams } from "../media-table-spec";
import { cellShared } from "./cell-shared.stylex";

export function MediaOverviewCell({ api, row }: MediaCellParams) {
  if (!api.rowIsLeaf(row)) return null;
  const overview = row.data.overview;
  if (!overview) return <span css={cellShared.empty}>—</span>;

  return (
    <span css={[styles.overview, truncate.base]} title={overview}>
      {overview}
    </span>
  );
}

const styles = stylex.create({
  overview: {
    color: color.textSubtle,
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_3,
  },
});
