import * as stylex from "@stylexjs/stylex";

/**
 * The two widths a design-system page is built from. In rem rather than `ch`,
 * which is the width of a Latin zero: it would give the small print a different
 * edge from the body copy, and Chinese a different one again.
 */
export const measure = stylex.defineConsts({
  /** Every block of prose. Around 65 Latin characters, 41 han. */
  prose: "41rem",
  /**
   * The page itself: one prose measure plus a showcase card's padding either
   * side, so text filling a card lands on the same measure the page caps to.
   */
  reading: "48rem",
});
