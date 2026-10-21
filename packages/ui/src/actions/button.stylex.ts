import * as stylex from "@stylexjs/stylex";
import { color, controlHeight, controlSize, shadow } from "../tokens.stylex.ts";

export const buttonTokens = stylex.defineVars({
  backgroundColor: color.bgControl,
  backgroundColorHover: color.bgControlHover,
  backgroundColorDisabledHover: color.bgControl,
  boxShadow: shadow._2,
  color: color.fg,
  height: controlHeight.md,
  paddingInline: controlSize._3,
});
