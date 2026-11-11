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
  // The glyph of an icon-only button. A Phosphor glyph at bold weight fills
  // its box, so 40% of the height already reads as heavy as the label of a
  // button beside it. A glyph at half the height looks too large.
  glyph: controlSize._4,
});
