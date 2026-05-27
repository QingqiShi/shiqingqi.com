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
    // Gridline-via-gap: the column is a solid bgCanvas rectangle (the canvas
    // ground the tiles sit on); the cells cover it except the row gaps, so the
    // ground shows through as hairline dividers, with a matching bgCanvas
    // border as the outer frame. A border (unlike padding) makes overflow
    // shrink the clip radius by its own width, so the corner cells stay
    // concentric with the frame and the ground doesn't bulge at the rounded
    // corners. Replaces the inset box-shadow, which children paint over.
    // Translucent role fills composite over this ground, so dividers read
    // softer next to them.
    rowGap: space._00,
    backgroundColor: color.bgCanvas,
    borderWidth: space._00,
    borderStyle: "solid",
    borderColor: color.bgCanvas,
    borderRadius: border.radius_2,
    overflow: "hidden",
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
