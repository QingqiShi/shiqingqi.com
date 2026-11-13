import * as stylex from "@stylexjs/stylex";
import { pointer } from "../breakpoints.stylex.ts";
import { color } from "../color.stylex.ts";
import { border, shadow } from "../tokens.stylex.ts";

/**
 * The bordered-surface skin shared by every card, exposed as composable
 * StyleX so an element `Card` can't be — a `<Link>`, a plain `<a>`, an `<li>`
 * — can still carry the same surface.
 *
 * The surface has a hairline edge and a small shadow. In light, the fill
 * is the same as the fill of the page, so the edge and the shadow set a card
 * apart.
 *
 * Its focus ring is inlined inset, not `a11y.focusRingInset`: an outward ring
 * would crop against the card's clipped overflow, and a primitive can't
 * compose another at definition time. Keep the copy the same as the original.
 *
 * Of `a11y.touchTarget`, it takes only the tap highlight and `touch-action`.
 * A card is larger than 44px, so a hit area would add nothing, and the
 * `position` and `isolation` the hit area needs would change how a card's
 * content stacks on a touch screen. Keep the two declarations the same as the
 * original.
 */
export const cardSurface = stylex.create({
  base: {
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    borderRadius: border.radius_3,
    cornerShape: "squircle",
    backgroundColor: color.card,
    boxShadow: shadow._1,
  },
  interactive: {
    cursor: "pointer",
    borderColor: {
      default: color.border,
      ":hover": {
        default: null,
        [pointer.canHover]: color.primary,
      },
    },
    backgroundColor: {
      default: color.card,
      ":hover": {
        default: null,
        [pointer.canHover]: color.accent,
      },
      ":active": {
        default: color.accent,
        [pointer.canHover]: color.accent,
      },
    },
    outlineWidth: border.size_2,
    outlineStyle: "solid",
    outlineColor: {
      default: "transparent",
      ":focus-visible": color.ring,
    },
    outlineOffset: `calc(-1 * ${border.size_2})`,
    WebkitTapHighlightColor: "transparent",
    touchAction: "manipulation",
  },
});
