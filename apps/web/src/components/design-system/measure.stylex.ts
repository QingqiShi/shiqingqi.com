import * as stylex from "@stylexjs/stylex";

/**
 * The Measure: the width cap for a block of prose, in `em` so the cap tracks
 * its text's size.
 */
export const measure = stylex.defineConsts({
  /** Every block of prose. 41 Chinese characters at any size, around 88 Latin. */
  prose: "41em",
});
