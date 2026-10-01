"use client";

import * as stylex from "@stylexjs/stylex";
import { truncate } from "@tuja/ui/primitives/layout.stylex";
import { color, font } from "@tuja/ui/tokens.stylex";
import { cellShared } from "./cell-shared.stylex";
import type { MediaCellParams } from "./types";

export function MediaLanguageCell({ api, column, row }: MediaCellParams) {
  const value = api.columnField(column, row);
  if (typeof value !== "string" || !value) {
    return <span css={cellShared.empty}>—</span>;
  }
  return <span css={[styles.language, truncate.base]}>{value}</span>;
}

const styles = stylex.create({
  language: {
    color: color.fgMuted,
    fontSize: font.uiBodySmall,
  },
});
