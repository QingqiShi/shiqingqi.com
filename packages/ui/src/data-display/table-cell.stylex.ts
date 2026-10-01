import * as stylex from "@stylexjs/stylex";
import { space } from "../tokens.stylex.ts";

/** @internal Base cell layout, shared by `TableHeaderCell` and `TableCell`. */
export const styles = stylex.create({
  cell: {
    paddingBlock: space._2,
    paddingInline: space._3,
    textAlign: "start",
    verticalAlign: "top",
  },
  // A figure broken across lines no longer reads as one value, so a narrow
  // table scrolls rather than wrap it.
  numeric: {
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  },
});

/** @internal */
export const alignStyles = stylex.create({
  start: { textAlign: "start" },
  center: { textAlign: "center" },
  end: { textAlign: "end" },
});
