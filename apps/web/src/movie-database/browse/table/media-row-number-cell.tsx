"use client";

import * as stylex from "@stylexjs/stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color } from "@tuja/ui/tokens.stylex";
import type { MediaCellParams } from "./types";

/** Row number in the current (possibly sorted) view. */
export function MediaRowNumberCell({ rowIndex }: MediaCellParams) {
  return (
    <span css={[typeRole.caption, typeModifier.numeric, styles.rowNumber]}>
      {rowIndex + 1}
    </span>
  );
}

const styles = stylex.create({
  rowNumber: {
    color: color.fgMuted,
  },
});
