import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@/breakpoints.stylex";
import { space } from "@/tokens.stylex";

export const glowTokens = stylex.defineVars({
  height: {
    default: space._12,
    [breakpoints.sm]: space._13,
  },
});
