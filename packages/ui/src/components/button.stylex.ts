import * as stylex from "@stylexjs/stylex";
import { border, color, controlSize } from "../tokens.stylex.ts";

export const buttonTokens = stylex.defineVars({
  backgroundColor: color.bgInteractiveRest,
  backgroundColorHover: color.bgInteractiveHover,
  backgroundColorDisabledHover: color.bgInteractiveRest,
  borderRadius: border.radius_round,
  // No light source above the page, so a button's fill separates it — no shadow.
  boxShadow: "none",
  color: color.textMain,
  height: controlSize._9,
});
