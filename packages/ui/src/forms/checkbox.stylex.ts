import * as stylex from "@stylexjs/stylex";
import { opacity } from "../tokens.stylex.ts";

/** @internal */
export const checkboxTokens = stylex.defineVars({
  // The mask the box's `::before` paints in `currentColor`. `:checked` and
  // `:indeterminate` set the tick or dash. The rest state is a fully
  // transparent mask, not `none`: `mask-image: none` masks nothing out, so the
  // pseudo-element would paint the whole box.
  glyph: "linear-gradient(transparent, transparent)",
  glyphSize: "74% 74%",
});

/**
 * A native `<input>` drawn as a mark, shared by `Checkbox` and `RadioGroup`:
 * no native look, a solid edge, the disabled cursor and fade, and the glyph
 * of `checkboxTokens`, which its `::before` paints in `currentColor`. Give it
 * a size, an edge width and colours.
 *
 * @internal
 */
export const checkboxMark = stylex.create({
  base: {
    appearance: "none",
    margin: 0,
    flexShrink: 0,
    boxSizing: "border-box",
    borderStyle: "solid",
    cursor: { default: "pointer", ":disabled": "not-allowed" },
    opacity: { default: 1, ":disabled": opacity.disabled },
    "::before": {
      content: "",
      display: "block",
      width: "100%",
      height: "100%",
      backgroundColor: "currentColor",
      maskImage: checkboxTokens.glyph,
      maskRepeat: "no-repeat",
      maskPosition: "center",
      maskSize: checkboxTokens.glyphSize,
    },
  },
});
