import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { space } from "@tuja/ui/tokens.stylex";

const BAR_BLOCK_SIZE = `calc(${space._8} + ${space._1})`;

/**
 * The Finance tab bar below `md`. `clearance` is the strip it covers at the
 * bottom of the screen, safe area included, and 0 where there is no bar:
 * keep content, floating actions and sticky footers above it.
 */
export const tabBarTokens = stylex.defineVars({
  blockSize: BAR_BLOCK_SIZE,
  clearance: {
    default: `calc(${BAR_BLOCK_SIZE} + env(safe-area-inset-bottom))`,
    [breakpoints.md]: "0px",
  },
});
