import * as stylex from "@stylexjs/stylex";

/**
 * The two widths a design-system page is built from. `prose` is in `em` so the
 * cap tracks its text's size; `reading` is a layout width, so it stays in `rem`.
 */
export const measure = stylex.defineConsts({
  /** Every block of prose. 41 Chinese characters at any size, around 88 Latin. */
  prose: "41em",
  /**
   * The page itself, sized to hold a showcase card's specimens. Not derived from
   * `prose`: a paragraph caps itself, and tying the two starves a wide specimen.
   */
  reading: "48rem",
});
