import * as stylex from "@stylexjs/stylex";
import { color } from "../color.stylex.ts";
import { font } from "../tokens.stylex.ts";

export const anchorTokens = stylex.defineVars({
  color: { default: color.fg, ":hover": color.fgMuted },
  fontWeight: font.weight_6,
});
