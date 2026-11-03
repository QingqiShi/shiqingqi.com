import * as stylex from "@stylexjs/stylex";

/**
 * The sizes of a `NavigationSplitView`. The view sets `columnInsetBlockEnd` on
 * each column: the strip at the bottom of the column that its content keeps
 * clear of, which is the floating tab bar of a `TabView` below `md`, or else the
 * safe area. A sticky footer in a column sticks its own gap above it. It is 0
 * outside a column.
 */
export const splitViewTokens = stylex.defineVars({
  columnInsetBlockEnd: "0px",
  /**
   * The width of the full sidebar where it shows beside the content. The view
   * shows the sidebar beside the content from the same view width whatever this
   * is. Set it on the view with `css`.
   */
  sidebarInlineSize: "21.25rem",
});
