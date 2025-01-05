import * as stylex from "@stylexjs/stylex";
import { color } from "@/tokens.stylex";

export const anchorTokens = stylex.defineVars({
  color: { default: color.textMain, ":hover": color.textMuted },
});
