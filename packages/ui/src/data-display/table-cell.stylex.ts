import * as stylex from "@stylexjs/stylex";
import { space } from "../tokens.stylex.ts";
import { tableMarker, tableTokens } from "./table.stylex.ts";

/** `Table` sets this attribute while its first column sticks. */
const STICKY_COLUMN = ":is([data-sticky-column])";
/** A cell in a `Table` whose first column sticks. */
const IN_STICKY_COLUMN_TABLE = ":is([data-sticky-column] *)";
/**
 * A cell in a row that sets `data-row-fill`. Such a row paints an opaque fill,
 * also at rest, so its sticky cell can take the fill of the row at each frame
 * of a transition.
 */
const IN_FILLED_ROW = ":is([data-row-fill] > *)";

/** @internal Base cell layout, shared by `TableHeaderCell` and `TableCell`. */
export const styles = stylex.create({
  cell: {
    paddingBlock: space._2,
    paddingInline: space._3,
    textAlign: "start",
    verticalAlign: tableTokens.cellAlignBlock,
    boxShadow: {
      default: tableTokens.cellRule,
      ":first-child": {
        default: tableTokens.cellRule,
        [stylex.when.ancestor(STICKY_COLUMN, tableMarker)]:
          `${tableTokens.cellRule}, ${tableTokens.columnEdge}`,
      },
    },
    // Over the cells that scroll under it, and over what they position.
    position: {
      default: null,
      ":first-child": {
        default: null,
        [stylex.when.ancestor(STICKY_COLUMN, tableMarker)]: "sticky",
      },
    },
    insetInlineStart: {
      default: null,
      ":first-child": {
        default: null,
        [stylex.when.ancestor(STICKY_COLUMN, tableMarker)]: 0,
      },
    },
    zIndex: {
      default: null,
      ":first-child": {
        default: null,
        [stylex.when.ancestor(STICKY_COLUMN, tableMarker)]: 1,
      },
    },
    // The condition on the row must win over the condition on the table.
    // StyleX gives a higher priority only to a nested condition, and a
    // `stylex.when` key cannot hold one. Thus these two conditions are
    // selectors.
    backgroundColor: {
      default: null,
      ":first-child": {
        default: null,
        [IN_STICKY_COLUMN_TABLE]: {
          default: tableTokens.stickyFill,
          [IN_FILLED_ROW]: "inherit",
        },
      },
    },
  },
  // A figure broken across lines no longer reads as one value, so a narrow
  // table scrolls rather than wrap it.
  numeric: {
    whiteSpace: "nowrap",
  },
});

/** @internal */
export const alignStyles = stylex.create({
  start: { textAlign: "start" },
  center: { textAlign: "center" },
  end: { textAlign: "end" },
});
