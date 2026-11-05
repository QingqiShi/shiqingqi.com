import * as stylex from "@stylexjs/stylex";
import { color } from "../color.stylex.ts";
import { border, rhythm, space } from "../tokens.stylex.ts";

/**
 * How the caret of a `ListRow` shows. A `NavigationSplitView` sets it to `none`
 * for a sidebar that shows beside the content, as a row then opens beside the
 * list.
 *
 * @internal
 */
export const listRowTokens = stylex.defineVars({
  caretDisplay: "inline-flex",
});

/**
 * The pieces `List` and `ListRow` are built from, for an item that is not a
 * row the list can open, such as a loading placeholder. `item` draws the
 * divider above every item but the first; `row` sets the height and padding
 * of a row.
 */
export const listSurface = stylex.create({
  list: {
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  item: {
    display: "flex",
    alignItems: "center",
    borderBlockStartWidth: { default: border.size_1, ":first-child": 0 },
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.border,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: rhythm.tight,
    flexGrow: 1,
    minInlineSize: 0,
    minBlockSize: space._8,
    paddingBlock: space._1,
    paddingInline: space._3,
  },
});
