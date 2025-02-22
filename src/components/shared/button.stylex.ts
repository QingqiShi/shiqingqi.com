import * as stylex from "@stylexjs/stylex";
import { border, color, shadow } from "@/tokens.stylex";

export const buttonTokens = stylex.defineVars({
  backgroundColor: {
    default: color.backgroundRaised,
    ":hover": color.backgroundHover,
    ":disabled:hover": color.backgroundRaised,
  },
  borderRadius: border.radius_round,
  boxShadow: shadow._2,
  color: color.textMain,
});
