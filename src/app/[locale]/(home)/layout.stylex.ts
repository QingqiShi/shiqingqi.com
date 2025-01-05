import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@/breakpoints";
import { size } from "@/tokens.stylex";

export const glowTokens = stylex.defineVars({
  height: {
    default: size._12,
    [breakpoints.sm]: size._13,
  },
});
