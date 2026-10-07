import * as stylex from "@stylexjs/stylex";
import { border, color, rhythm } from "@tuja/ui/tokens.stylex";

/**
 * The row anatomy `GuideList` and the stacked `PropsTable` share. Inside a row
 * the term, value and note bind at `rhythm.tight`. A rule separates two rows,
 * with `rhythm.item` on each side of it and no space past the first or the
 * last row. Compose `definition` after `stack.tight`.
 */
export const definitionRows = stylex.create({
  list: {
    display: "flex",
    flexDirection: "column",
    gap: rhythm.item,
    margin: 0,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    rowGap: rhythm.tight,
    alignItems: "baseline",
    paddingBlockStart: { default: 0, ":not(:first-child)": rhythm.item },
    borderBlockStartWidth: { default: 0, ":not(:first-child)": border.size_1 },
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.border,
    minInlineSize: 0,
  },
  definition: {
    margin: 0,
    minInlineSize: 0,
  },
});
