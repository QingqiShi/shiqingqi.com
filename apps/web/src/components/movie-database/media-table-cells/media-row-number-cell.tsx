"use client";

import * as stylex from "@stylexjs/stylex";
import { color, font } from "@tuja/ui/tokens.stylex";
import type { MediaCellParams } from "../media-table-spec";

/** Row number in the current (possibly sorted) view. */
export function MediaRowNumberCell({ rowIndex }: MediaCellParams) {
  return <span css={styles.rowNumber}>{rowIndex + 1}</span>;
}

const styles = stylex.create({
  rowNumber: {
    color: color.textSubtle,
    fontSize: font.uiCaption,
    fontVariantNumeric: "tabular-nums",
  },
});
