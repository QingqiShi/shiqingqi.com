import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";

type RoleCellSize = "large" | "medium" | "thin";

interface RoleCell {
  size: RoleCellSize;
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
    <div css={styles.column} aria-label={name}>
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
            <span css={[styles.token, cell.fg]}>{cell.token}</span>
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
    rowGap: space._00,
    borderRadius: border.radius_2,
    overflow: "hidden",
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
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
  token: {
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    opacity: 0.85,
    lineHeight: font.lineHeight_2,
    overflowWrap: "anywhere",
  },
});
