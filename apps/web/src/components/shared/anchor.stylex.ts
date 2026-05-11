import * as stylex from "@stylexjs/stylex";
import { color, font } from "@tuja/ui/tokens.stylex";

export const anchorTokens = stylex.defineVars({
  color: { default: color.textMain, ":hover": color.textMuted },
  fontWeight: font.weight_6,
});
