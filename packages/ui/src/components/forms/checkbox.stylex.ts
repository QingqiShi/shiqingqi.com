import * as stylex from "@stylexjs/stylex";

/** @internal */
export const checkboxTokens = stylex.defineVars({
  // The mask the box's `::before` paints in `currentColor`. `:checked` and
  // `:indeterminate` set the tick or dash. The rest state is a fully
  // transparent mask, not `none`: `mask-image: none` masks nothing out, so the
  // pseudo-element would paint the whole box.
  glyph: "linear-gradient(transparent, transparent)",
});
