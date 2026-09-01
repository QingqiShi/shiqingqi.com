"use client";

import * as stylex from "@stylexjs/stylex";
import { color, font } from "@tuja/ui/tokens.stylex";
import { useMediaTable } from "../media-table-context";
import type { MediaCellParams } from "../media-table-spec";
import { cellShared } from "./cell-shared.stylex";

export function MediaReleaseDateCell({ api, row }: MediaCellParams) {
  const { date } = useMediaTable();

  if (!api.rowIsLeaf(row)) return null;
  const iso = row.data.releaseDate;
  if (!iso) return <span css={cellShared.empty}>—</span>;

  // TMDB dates are plain calendar days. Parsing them as UTC and formatting in
  // UTC keeps a January 1st release from slipping to December 31st for anyone
  // west of Greenwich.
  const parsed = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return <span css={cellShared.empty}>—</span>;
  }

  return <span css={styles.date}>{date.format(parsed)}</span>;
}

const styles = stylex.create({
  date: {
    color: color.textMuted,
    fontSize: font.uiBodySmall,
    fontVariantNumeric: "tabular-nums",
  },
});
