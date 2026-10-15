import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { controlSize, shadow, space } from "@tuja/ui/tokens.stylex";
import { tabBarTokens } from "./tab-bar.stylex.ts";

const INSET_BLOCK_END_BELOW_MD = `calc(${tabBarTokens.clearance} + ${space._3})`;
const INSET_BLOCK_END_FROM_MD = `calc(${space._5} + env(safe-area-inset-bottom))`;
const BLOCK_SIZE = controlSize._10;

export const floatingActionTokens = stylex.defineVars({
  /**
   * Where an action floats, as the distance from the bottom of the screen:
   * above the tab bar below `md`, above the safe area from `md` up.
   */
  insetBlockEnd: {
    default: INSET_BLOCK_END_BELOW_MD,
    [breakpoints.md]: INSET_BLOCK_END_FROM_MD,
  },
  /** The height of the floating Add action. */
  blockSize: BLOCK_SIZE,
  /**
   * The strip from the bottom of the screen to a gap above the Add action,
   * and 0 from `lg` up, where there is no Add action: keep content above it.
   */
  clearance: {
    default: `calc(${INSET_BLOCK_END_BELOW_MD} + ${BLOCK_SIZE} + ${space._3})`,
    [breakpoints.md]: {
      default: `calc(${INSET_BLOCK_END_FROM_MD} + ${BLOCK_SIZE} + ${space._3})`,
      [breakpoints.lg]: "0px",
    },
  },
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
