import * as stylex from "@stylexjs/stylex";
import { buttonTokens } from "../actions/button.stylex.ts";
import { pointer } from "../breakpoints.stylex.ts";
import { color } from "../tokens.stylex.ts";

/**
 * The safe-area insets that `SidebarLayout` keeps its chrome and content
 * clear of. They are the screen's, because the shell fills the screen. A box
 * that holds the shell away from the edges of the screen sets each to `0px`.
 */
export const sidebarLayoutTokens = stylex.defineVars({
  safeAreaTop: "env(safe-area-inset-top)",
  safeAreaRight: "env(safe-area-inset-right)",
  safeAreaBottom: "env(safe-area-inset-bottom)",
  safeAreaLeft: "env(safe-area-inset-left)",
});

/**
 * Styles that the shell's own chrome shares.
 *
 * @internal
 */
export const sidebarLayoutStyles = stylex.create({
  /**
   * The menu and close buttons, ghost icon `Button`s beside the header. The
   * glyph is muted at rest, also on touch, so that it does not compete with
   * the title, and full strength on hover.
   */
  headerControl: {
    [buttonTokens.color]: {
      default: color.fgMuted,
      ":hover": { default: null, [pointer.canHover]: color.fg },
    },
  },
});
