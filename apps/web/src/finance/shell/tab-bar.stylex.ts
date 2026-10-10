import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { space } from "@tuja/ui/tokens.stylex";

const BAR_BLOCK_SIZE = space._9;
// The gap below the bar is the page gutter where the screen has no safe area,
// so that the bar floats the same distance from the bottom edge as from the
// side edges.
const BAR_INSET_BLOCK_END = `max(${space._3}, calc(env(safe-area-inset-bottom) + ${space._1}))`;

/**
 * The Finance tab bar below `md`, a pill that floats above the bottom of the
 * screen. `clearance` is the strip from the bottom of the screen to the top of
 * the pill, safe area included, and 0 where there is no bar: keep content,
 * floating actions and sticky footers above it.
 */
export const tabBarTokens = stylex.defineVars({
  blockSize: BAR_BLOCK_SIZE,
  insetBlockEnd: BAR_INSET_BLOCK_END,
  clearance: {
    default: `calc(${BAR_BLOCK_SIZE} + ${BAR_INSET_BLOCK_END})`,
    [breakpoints.md]: "0px",
  },
});
