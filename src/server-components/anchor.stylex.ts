import * as stylex from "@stylexjs/stylex";
import { tokens } from "@/tokens.stylex";

export const anchorTokens = stylex.defineVars({
  color: { default: tokens.textMain, ":hover": tokens.textMuted },
});
