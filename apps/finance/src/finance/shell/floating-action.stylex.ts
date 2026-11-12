import * as stylex from "@stylexjs/stylex";
import { tabViewTokens } from "@tuja/ui/components/tab-view.stylex";
import { controlSize, space } from "@tuja/ui/tokens.stylex";

export const floatingActionTokens = stylex.defineVars({
  /**
   * Where an action floats, as the distance from the bottom of the screen:
   * above the tab bar below 34rem, above the safe area from 34rem up.
   */
  insetBlockEnd: `max(calc(${tabViewTokens.barClearance} + ${space._3}), calc(${space._5} + env(safe-area-inset-bottom)))`,
  /** The height of the floating Add action. */
  blockSize: controlSize._10,
});
