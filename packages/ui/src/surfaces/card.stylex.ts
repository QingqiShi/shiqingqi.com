import * as stylex from "@stylexjs/stylex";
import { pointer } from "../breakpoints.stylex.ts";
import { border, color } from "../tokens.stylex.ts";

/**
 * The bordered-surface skin shared by every card, exposed as composable
 * StyleX so an element `Card` can't be — a `<Link>`, a plain `<a>`, an `<li>`
 * — can still carry the same surface.
 *
 * Its focus ring is inlined inset, not `a11y.focusRingInset`: an outward ring
 * would crop against the card's clipped overflow, and a primitive can't
 * compose another at definition time. `primitives/focus-ring.test.ts` keeps
 * the copy the same as the original.
 *
 * Of `a11y.touchTarget`, it takes only the tap highlight and `touch-action`.
 * A card is larger than 44px, so a hit area would add nothing, and the
 * `position` and `isolation` the hit area needs would change how a card's
 * content stacks on a touch screen. `primitives/touch-target.test.ts` keeps
 * the two declarations the same as the original.
 */
export const cardSurface = stylex.create({
  base: {
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    borderRadius: border.radius_3,
    cornerShape: "squircle",
    backgroundColor: color.bgSurface,
  },
  interactive: {
    cursor: "pointer",
    borderColor: {
      default: color.border,
      ":hover": {
        default: null,
        [pointer.canHover]: color.borderAccent,
      },
    },
    backgroundColor: {
      default: color.bgSurface,
      ":hover": {
        default: null,
        [pointer.canHover]: color.bgControlHover,
      },
    },
    outlineWidth: border.size_2,
    outlineStyle: "solid",
    outlineColor: {
      default: "transparent",
      ":focus-visible": color.borderAccent,
    },
    outlineOffset: `calc(-1 * ${border.size_2})`,
    WebkitTapHighlightColor: "transparent",
    touchAction: "manipulation",
  },
});
