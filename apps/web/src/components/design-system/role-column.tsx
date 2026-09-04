import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";
import { font, space } from "@tuja/ui/tokens.stylex";
import { gridlineGround } from "./gridline-ground.stylex.ts";
import { Identifier } from "./identifier.tsx";

interface RoleCell {
  size: "large" | "medium" | "thin";
  bg: StyleXStyles;
  fg: StyleXStyles;
  label: string;
  token: string;
}

interface RoleColumnProps {
  name: string;
  cells: readonly RoleCell[];
}

export function RoleColumn({ name, cells }: RoleColumnProps) {
  return (
    <div css={[gridlineGround.base, styles.column]} aria-label={name}>
      {cells.map((cell) => {
        const sizeStyle =
          cell.size === "large"
            ? styles.cellLarge
            : cell.size === "medium"
              ? styles.cellMedium
              : styles.cellThin;
        return (
          <div key={cell.token} css={[styles.cell, sizeStyle, cell.bg]}>
            <span css={[styles.label, cell.fg]}>{cell.label}</span>
            <span css={[styles.token, cell.fg]}>
              <Identifier>{cell.token}</Identifier>
            </span>
          </div>
        );
      })}
    </div>
  );
}

const styles = stylex.create({
  column: {
    // Subgrid inherits the parent's row tracks so every cell at row N shares its
    // height across all six columns — keeps the bento aligned even when token
    // names wrap differently per column.
    display: "grid",
    gridTemplateRows: "subgrid",
    gridRow: "span 5",
    // Rows only: the ground, frame, and clip come from `gridlineGround`, and a
    // column has no cells beside each other to divide.
    rowGap: space._00,
  },
  cell: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    paddingBlock: space._2,
    paddingInline: space._3,
    gap: space._0,
  },
  cellLarge: {
    minBlockSize: "108px",
  },
  cellMedium: {
    minBlockSize: "72px",
  },
  cellThin: {
    minBlockSize: "44px",
    paddingBlock: space._1,
  },
  label: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    letterSpacing: font.trackingSnug,
    lineHeight: font.lineHeight_2,
  },
  // Matches the surface cells' token label: caption size at full strength, so
  // the name stays readable on the tinted and solid role fills alike.
  token: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    letterSpacing: font.trackingTight,
    lineHeight: font.lineHeight_2,
  },
});
