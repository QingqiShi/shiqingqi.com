import * as stylex from "@stylexjs/stylex";
import { color } from "../color.stylex.ts";

const NO_SHADOW = "0 0 transparent";

export const tableTokens = stylex.defineVars({
  // `position` takes no `var()`, so `Table` switches this token instead of
  // position; `auto` leaves the head in flow.
  headInset: "auto",
  // Painted behind the head only while it sticks, so rows scrolling under it do
  // not show through.
  headBackground: "transparent",
  // The opaque fill of a cell in a sticky column, so the cells that scroll
  // under it do not show through. A row with a fill of its own sets it, or
  // sets `data-row-fill` so that the cell takes the fill of the row.
  stickyFill: color.bgSurface,
  // The rule a cell draws on its top edge, as a shadow. A row group that
  // moves sets it, because a collapsed border stays where the layout put it.
  cellRule: NO_SHADOW,
  // The edge of a sticky column while other columns pass under it.
  columnEdge: NO_SHADOW,
  // Where a cell sets its content in the height of its row. `Table` sets it.
  cellAlignBlock: "top",
  // The width of the scroll region's visible box, while the table overflows
  // it. `TableDisclosure` keeps its panel this wide.
  scrollport: "100%",
});

/**
 * Marks a `Table` whose first column sticks, so its cells can follow.
 *
 * @internal
 */
export const tableMarker = stylex.defineMarker();
