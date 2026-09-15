import * as stylex from "@stylexjs/stylex";
import { color, controlSize, shadow } from "../../tokens.stylex.ts";

export const buttonTokens = stylex.defineVars({
  backgroundColor: color.bgControl,
  backgroundColorHover: color.bgControlHover,
  backgroundColorDisabledHover: color.bgControl,
  boxShadow: shadow._2,
  color: color.fg,
  height: controlSize._9,
  paddingInline: controlSize._3,
});
