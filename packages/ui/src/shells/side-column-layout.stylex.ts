import * as stylex from "@stylexjs/stylex";

/**
 * The sizes of a `SideColumnLayout`. Set them on the layout with `css`. The
 * column shows only where the layout is at least as wide as the two
 * together, so keep `mainMinInlineSize` at least as wide as `inlineSize`:
 * the column then never reaches the middle of the screen.
 */
export const sideColumnTokens = stylex.defineVars({
  /** The width of the column. */
  inlineSize: "24rem",
  /** The least width that the main content keeps beside the column. */
  mainMinInlineSize: "40rem",
});
