import * as stylex from "@stylexjs/stylex";
import { buttonTokens } from "../actions/button.stylex.ts";
import { breakpoints, pointer } from "../breakpoints.stylex.ts";
import { color, space } from "../tokens.stylex.ts";

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
 * The rail's own sizes, which its header, nav and footer share.
 *
 * @internal
 */
export const railTokens = stylex.defineVars({
  /** How far the box edge of the nav is in from the edge of the card. */
  boxInset: { default: space._3, [breakpoints.md]: space._2 },
  /** The width of the card at `md` and wider, set from the rail column. */
  cardInlineSize: "auto",
});

/**
 * Styles that the shell's own chrome shares.
 *
 * @internal
 */
export const sidebarLayoutStyles = stylex.create({
  /**
   * The drawer's close button, a ghost icon `Button` beside the header. The
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
