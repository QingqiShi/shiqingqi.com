import * as stylex from "@stylexjs/stylex";

/**
 * The sizes that `ScrollMask` measures and sets on its scroller, so that the
 * scroller's own styles in `contentCss` can read them.
 */
export const scrollMaskTokens = stylex.defineVars({
  /**
   * The measured block or inline size of the `endChrome` slot. It is `0px`
   * without the slot.
   */
  endChrome: "0px",
});
