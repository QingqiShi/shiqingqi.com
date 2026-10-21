import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "../breakpoints.stylex.ts";
import { space } from "../tokens.stylex.ts";

/**
 * The block padding of the `SidebarLayout` content at `md` and wider. A
 * screen that fills the height of the viewport, such as a list beside its
 * detail, cancels it with negative margins.
 */
export const sidebarLayoutTokens = stylex.defineVars({
  contentPaddingBlockStart: { default: "0px", [breakpoints.md]: space._4 },
  contentPaddingBlockEnd: {
    default: "0px",
    [breakpoints.md]: `calc(${space._8} + env(safe-area-inset-bottom))`,
  },
});
