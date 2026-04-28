import * as stylex from "@stylexjs/stylex";
import { border, color, controlSize, shadow } from "#src/tokens.stylex.ts";

export const buttonTokens = stylex.defineVars({
  backgroundColor: color.backgroundRaised,
  backgroundColorHover: color.backgroundHover,
  backgroundColorDisabledHover: color.backgroundRaised,
  borderRadius: border.radius_round,
  boxShadow: shadow._2,
  color: color.textMain,
  height: controlSize._9,
});
