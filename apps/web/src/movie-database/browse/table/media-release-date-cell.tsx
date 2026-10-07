"use client";

import * as stylex from "@stylexjs/stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color } from "@tuja/ui/tokens.stylex";
import { cellShared } from "./cell-shared.stylex";
import { useMediaTable } from "./media-table-context";
import type { MediaCellParams } from "./types";

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

  return (
    <span css={[typeRole.bodySmall, typeModifier.numeric, styles.date]}>
      {date.format(parsed)}
    </span>
  );
}

const styles = stylex.create({
  date: {
    color: color.fgMuted,
  },
});
