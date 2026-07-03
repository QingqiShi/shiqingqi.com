import * as stylex from "@stylexjs/stylex";
import { border, color, controlSize, shadow } from "../tokens.stylex.ts";

export const buttonTokens = stylex.defineVars({
  backgroundColor: color.bgInteractiveRest,
  backgroundColorHover: color.bgInteractiveHover,
  backgroundColorDisabledHover: color.bgInteractiveRest,
  borderRadius: border.radius_round,
  boxShadow: shadow._2,
  color: color.textMain,
  height: controlSize._9,
});
