import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { space } from "#src/tokens.stylex.ts";

export const glowTokens = stylex.defineVars({
  height: {
    default: space._12,
    [breakpoints.sm]: space._13,
  },
});
