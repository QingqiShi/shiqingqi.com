import { tokens } from "@/tokens.stylex";
import * as stylex from "@stylexjs/stylex";

export const anchorTokens = stylex.defineVars({
  color: { default: tokens.textMain, ":hover": tokens.textMuted },
});
