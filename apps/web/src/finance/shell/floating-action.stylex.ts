import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { controlSize, shadow, space } from "@tuja/ui/tokens.stylex";
import { tabBarTokens } from "./tab-bar.stylex.ts";

export const floatingActionTokens = stylex.defineVars({
  /**
   * Where an action floats, as the distance from the bottom of the screen:
   * above the tab bar below `md`, above the safe area from `md` up.
   */
  insetBlockEnd: {
    default: `calc(${tabBarTokens.clearance} + ${space._3})`,
    [breakpoints.md]: `calc(${space._5} + env(safe-area-inset-bottom))`,
  },
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
