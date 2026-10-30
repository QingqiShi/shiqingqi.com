import * as stylex from "@stylexjs/stylex";

/**
 * The room that a shell's floating header controls take over the page. The
 * shells set them, and they are `0px` outside a shell. Sticky chrome, such
 * as `StickyControls` or a filter bar, parks below `clearance`, and an anchor
 * target takes it as its scroll margin. A first row, such as a page title or
 * a breadcrumb, pads its inline end by `inlineEndClearance`, so that it keeps
 * clear of a menu button that floats over its corner.
 */
export const headerControlsTokens = stylex.defineVars({
  /** The strip from the top of the screen to the bottom of the header controls. */
  clearance: "0px",
  /** The width of the controls that float over the inline end of the first row. */
  inlineEndClearance: "0px",
});
