import * as stylex from "@stylexjs/stylex";
import { color } from "../color.stylex.ts";
import { controlHeight, controlSize, shadow } from "../tokens.stylex.ts";

export const buttonTokens = stylex.defineVars({
  backgroundColor: color.card,
  backgroundColorHover: color.accent,
  backgroundColorDisabledHover: color.card,
  boxShadow: shadow._2,
  color: color.foreground,
  height: controlHeight.md,
  paddingInline: controlSize._3,
  // The glyph of an icon-only button. With no label beside it, the glyph is
  // the whole face, so it takes the size of the other lone glyphs in a row of
  // controls (a Checkbox box, a drag handle, a TabBar icon), not the 1em of a
  // label.
  glyph: controlSize._5,
});
