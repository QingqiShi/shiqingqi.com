import * as stylex from "@stylexjs/stylex";
import { rhythm, space } from "../tokens.stylex.ts";
import { listRowTokens } from "./list.stylex.ts";

/**
 * The layout of a `ListRow` with content `below`. The item is a grid of the
 * row's five columns and the actions. The row takes the columns as a
 * subgrid, so the content below starts in the column of the name.
 *
 * @internal
 */
export const listRowBelow = stylex.create({
  item: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr) auto auto auto auto",
  },
  row: {
    gridColumn: "1 / 6",
    gridRow: 1,
    gridTemplateColumns: "subgrid",
  },
  actions: {
    gridColumn: 6,
    gridRow: 1,
  },
  below: {
    gridColumn: "2 / -1",
    gridRow: 2,
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    justifyItems: "start",
    gap: rhythm.tight,
    minInlineSize: 0,
    paddingBlockEnd: space._2,
    paddingInlineEnd: listRowTokens.rowPaddingInline,
  },
});
