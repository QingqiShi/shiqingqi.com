import * as stylex from "@stylexjs/stylex";
import { color } from "@/tokens.stylex";

export const buttonTokens = stylex.defineVars({
  color: color.textMain,
  backgroundColor: {
    default: color.backgroundRaised,
    ":hover": color.backgroundHover,
    ":disabled:hover": color.backgroundRaised,
  },
});
