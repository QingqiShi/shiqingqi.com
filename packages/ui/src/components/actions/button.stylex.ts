import * as stylex from "@stylexjs/stylex";
import { color, controlSize, shadow } from "../../tokens.stylex.ts";

export const buttonTokens = stylex.defineVars({
  backgroundColor: color.bgInteractiveRest,
  backgroundColorHover: color.bgInteractiveHover,
  backgroundColorDisabledHover: color.bgInteractiveRest,
  boxShadow: shadow._2,
  color: color.textMain,
  height: controlSize._9,
  paddingInline: controlSize._3,
});
