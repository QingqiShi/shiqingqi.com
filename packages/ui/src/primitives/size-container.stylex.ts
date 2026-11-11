import * as stylex from "@stylexjs/stylex";

/**
 * A box that is a size container across the whole width of its parent, so
 * that a component in it can lay out by its own width, not the screen's.
 * A size container gets no width from its content. Thus, in a flex parent it
 * has a width of zero unless it sets its width itself.
 *
 * @internal
 */
export const sizeContainer = stylex.create({
  inline: {
    containerType: "inline-size",
    boxSizing: "border-box",
    inlineSize: "100%",
    minInlineSize: 0,
  },
});

/**
 * The widths of a `sizeContainer` at which a component in it changes its
 * layout.
 *
 * @internal
 */
export const containerWidth = stylex.defineConsts({
  /** `Columns` puts its columns side by side: a main column and an aside of about 15rem. */
  columnsBeside: "@container (width >= 44rem)",
  /** A `StatGroup` holds four stats in a row with the large figure. */
  statsWide: "@container (width >= 48rem)",
  /** Not `statsWide`, where the figure of a `Stat` steps down. */
  statsBelowWide: "@container (width < 48rem)",
  /**
   * A `StatGroup` holds two stats in a row, with a smaller figure. Below
   * 16rem, half the row is too narrow for a figure such as "£2,184.20", so
   * the stats stack.
   */
  statsInPairs: "@container (16rem <= width < 26rem)",
});
