import * as stylex from "@stylexjs/stylex";
import { border, color, controlSize, shadow } from "@tuja/ui/tokens.stylex";

export const buttonTokens = stylex.defineVars({
  backgroundColor: color.background2,
  backgroundColorHover: color.background5,
  backgroundColorDisabledHover: color.background2,
  borderRadius: border.radius_round,
  boxShadow: shadow._2,
  color: color.textMain,
  height: controlSize._9,
});
