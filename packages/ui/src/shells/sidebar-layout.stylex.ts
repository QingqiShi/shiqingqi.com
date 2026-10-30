import * as stylex from "@stylexjs/stylex";
import { buttonTokens } from "../actions/button.stylex.ts";
import { pointer } from "../breakpoints.stylex.ts";
import { color } from "../tokens.stylex.ts";

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
