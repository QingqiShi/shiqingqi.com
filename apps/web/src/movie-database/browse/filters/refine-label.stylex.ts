import * as stylex from "@stylexjs/stylex";

/**
 * The screen widths below which the mobile bar cannot hold a label of the
 * Refine button beside the AI button. `shorter` is for "Refine" and for
 * "筛选" with a count; `longer` is for "Refine" with a count. Each is the
 * width that the label needs with a two-digit count. They are in `rem`
 * because the label grows with the reader's text size.
 */
export const refineRoom = stylex.defineConsts({
  shorter: "@media (width < 21rem)",
  longer: "@media (width < 22.5rem)",
});

/**
 * How the word of the Refine button shows. The trigger sets these, and the
 * word reads them, because the same label is also the title of the open
 * panel, where the word always shows.
 */
export const refineWord = stylex.defineVars({
  position: "static",
  clipPath: "none",
});
