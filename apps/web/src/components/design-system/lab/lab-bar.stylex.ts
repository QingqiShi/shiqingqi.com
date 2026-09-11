import * as stylex from "@stylexjs/stylex";
import { controlSize, space } from "@tuja/ui/tokens.stylex";

export const labBar = stylex.defineVars({
  /**
   * What the bar takes from the foot of the viewport — a `sm` control, the
   * bar's own padding, and the safe area. The Canvas reserves it under the
   * snippet, and the Specimen centres in what is left.
   */
  clearance: `calc(${controlSize._8} + ${space._1} * 2 + env(safe-area-inset-bottom))`,
});
