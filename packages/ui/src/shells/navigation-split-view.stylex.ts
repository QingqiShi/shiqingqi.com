import * as stylex from "@stylexjs/stylex";

/**
 * Set by `NavigationSplitView` on each column. `columnInsetBlockEnd` is the
 * strip at the bottom of the column that its content keeps clear of: the
 * floating tab bar of a `TabView` below `md`, or else the safe area. A
 * sticky footer in a column sticks its own gap above it. It is 0 outside a
 * column.
 */
export const splitViewTokens = stylex.defineVars({
  columnInsetBlockEnd: "0px",
});
