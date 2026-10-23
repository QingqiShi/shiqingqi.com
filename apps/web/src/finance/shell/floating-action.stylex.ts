import * as stylex from "@stylexjs/stylex";
import { tabViewTokens } from "@tuja/ui/components/tab-view.stylex";
import { controlSize, shadow, space } from "@tuja/ui/tokens.stylex";

export const floatingActionTokens = stylex.defineVars({
  /**
   * Where an action floats, as the distance from the bottom of the screen:
   * above the tab bar below `md`, above the safe area from `md` up.
   */
  insetBlockEnd: `max(calc(${tabViewTokens.barClearance} + ${space._3}), calc(${space._5} + env(safe-area-inset-bottom)))`,
  /** The height of the floating Add action. */
  blockSize: controlSize._10,
});

/**
 * The lift of an action that floats over the content scrolling behind it:
 * the Add button and each of the `FloatingActions`. Compose it into the
 * Button's `css`.
 */
export const floatingAction = stylex.create({
  lift: {
    boxShadow: shadow._4,
  },
});
