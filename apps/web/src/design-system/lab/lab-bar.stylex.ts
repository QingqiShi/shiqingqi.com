import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { controlSize, space } from "@tuja/ui/tokens.stylex";

const BLOCK_SIZE = `calc(${controlSize._8} + ${space._1} * 2)`;
const INSET_BLOCK_END = `calc(${space._3} + env(safe-area-inset-bottom))`;

export const labBar = stylex.defineVars({
  /**
   * What the bar takes from the foot of the viewport: a `sm` control, the
   * bar's own padding, and the safe area. From `md` the bar floats, so its
   * gap from the foot of the viewport counts too. The Canvas reserves it
   * under the snippet, and the Specimen centres in what is left.
   */
  clearance: {
    default: `calc(${BLOCK_SIZE} + env(safe-area-inset-bottom))`,
    [breakpoints.md]: `calc(${BLOCK_SIZE} + ${INSET_BLOCK_END})`,
  },
  /** From `md`, the gap between the foot of the viewport and the bar. */
  insetBlockEnd: INSET_BLOCK_END,
});
