import * as stylex from "@stylexjs/stylex";
import { space } from "../tokens.stylex.ts";
import { tableMarker, tableTokens } from "./table.stylex.ts";

/** `Table` sets this attribute while its first column sticks. */
const STICKY_COLUMN = ":is([data-sticky-column])";

/** @internal Base cell layout, shared by `TableHeaderCell` and `TableCell`. */
export const styles = stylex.create({
  cell: {
    paddingBlock: space._2,
    paddingInline: space._3,
    textAlign: "start",
    verticalAlign: "top",
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
    backgroundColor: {
      default: null,
      ":first-child": {
        default: null,
        [stylex.when.ancestor(STICKY_COLUMN, tableMarker)]:
          tableTokens.stickyFill,
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
