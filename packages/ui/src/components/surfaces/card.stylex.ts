import * as stylex from "@stylexjs/stylex";
import { border, color } from "../../tokens.stylex.ts";

/**
 * The bordered-surface skin shared by every card, exposed as composable
 * StyleX so an element `Card` can't be — a `<Link>`, a plain `<a>`, an `<li>`
 * — can still carry the same surface.
 *
 * Its focus ring is inlined inset, not `a11y.focusRingInset`: an outward ring
 * would crop against the card's clipped overflow, and a primitive can't
 * compose another at definition time.
 */
export const cardSurface = stylex.create({
  base: {
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    borderRadius: border.radius_3,
    cornerShape: "squircle",
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
    outlineWidth: border.size_2,
    outlineStyle: "solid",
    outlineColor: { default: "transparent", ":focus-visible": color.accent },
    outlineOffset: `calc(-1 * ${border.size_2})`,
  },
});
