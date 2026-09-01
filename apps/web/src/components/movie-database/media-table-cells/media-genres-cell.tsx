"use client";

import * as stylex from "@stylexjs/stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { truncate } from "@tuja/ui/primitives/layout.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import { useMediaTable } from "../media-table-context";
import type { MediaCellParams } from "../media-table-spec";
import { cellShared } from "./cell-shared.stylex";

export function MediaGenresCell({ api, row }: MediaCellParams) {
  const { genreNames } = useMediaTable();

  if (!api.rowIsLeaf(row)) return null;
  const names = (row.data.genreIds ?? [])
    .map((id) => genreNames.get(id))
    .filter((name) => name !== undefined);

  if (!names.length) return <span css={cellShared.empty}>—</span>;

  const shown = names.slice(0, 2);
  const overflow = names.length - shown.length;

  return (
    <div css={styles.chipRow} title={names.join(", ")}>
      {shown.map((name) => (
        <span
          key={name}
          css={[corner.radius_round, styles.chip, truncate.base]}
        >
          {name}
        </span>
      ))}
      {overflow > 0 && <span css={styles.chipMore}>+{overflow}</span>}
    </div>
  );
}

const styles = stylex.create({
  chipRow: {
    display: "flex",
    alignItems: "center",
    gap: space._0,
    minInlineSize: 0,
  },
  chip: {
    maxInlineSize: "8rem",
    paddingBlock: space._00,
    paddingInline: space._1,
    backgroundColor: color.surfaceAccentSubtle,
    color: color.accentText,
    fontSize: font.uiOverline,
    fontWeight: font.weight_5,
    whiteSpace: "nowrap",
  },
  chipMore: {
    color: color.textSubtle,
    fontSize: font.uiOverline,
    fontWeight: font.weight_5,
  },
});
