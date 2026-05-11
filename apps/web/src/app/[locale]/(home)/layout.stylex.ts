import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { space } from "@tuja/ui/tokens.stylex";

export const glowTokens = stylex.defineVars({
  height: {
    default: space._12,
    [breakpoints.sm]: space._13,
  },
});
