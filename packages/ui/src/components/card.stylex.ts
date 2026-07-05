import * as stylex from "@stylexjs/stylex";
import { border, color } from "../tokens.stylex.ts";

/**
 * The bordered-surface skin shared by every card in the system, exposed as
 * composable StyleX so a consumer can drop the exact same surface onto an
 * element the `Card` component can't be — a Next.js `<Link>`, a plain `<a>`, or
 * an `<li>` inside a list. This is the custom-layer escape hatch behind the
 * `Card` component (which composes these same styles), mirroring how
 * `button-shared.stylex` backs both `Button` and the app's anchor button.
 *
 * `interactive` layers pointer affordances on top of `base`: it re-declares the
 * hover-sensitive properties so the two compose cleanly (last write wins per
 * property). Pair it with the `transition.colors` motion primitive at the call
 * site so the hover eases rather than snaps.
 */
export const cardSurface = stylex.create({
  base: {
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    borderRadius: border.radius_3,
    backgroundColor: color.bgSurface,
  },
  interactive: {
    cursor: "pointer",
    borderColor: {
      default: color.neutralBorder,
      ":hover": color.accentBorder,
    },
    backgroundColor: {
      default: color.bgSurface,
      ":hover": color.bgInteractiveHover,
    },
  },
});
