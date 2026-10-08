import * as stylex from "@stylexjs/stylex";
import { border, color } from "../tokens.stylex.ts";

const ringShape = {
  outlineWidth: border.size_2,
  outlineStyle: "solid",
  outlineOffset: border.size_2,
} as const;

/**
 * Accessibility primitives shared across components.
 *
 * `srOnly` hides content visually while keeping it in the accessibility tree
 * (screen-reader-only labels). `focusRing`/`focusRingInset` paint the shared
 * keyboard focus indicator (WCAG 2.4.7) on `:focus-visible` — use `focusRing`
 * by default, and `focusRingInset` where an ancestor clips overflow so an
 * outward ring would be cropped, and `focusRingWithin` on the frame of a
 * control that has no frame of its own. Every element that takes focus draws one;
 * `buttonReset.base` already carries `focusRing`.
 */
export const a11y = stylex.create({
  // Visually hidden, still announced. The `inset(50%)` clip + 1px box is the
  // canonical "visually hidden" recipe that survives flexbox and RTL.
  srOnly: {
    position: "absolute",
    inlineSize: "1px",
    blockSize: "1px",
    padding: 0,
    margin: "-1px",
    overflow: "hidden",
    clipPath: "inset(50%)",
    whiteSpace: "nowrap",
    borderWidth: 0,
  },
  // Keyboard focus ring. Transparent until `:focus-visible` so pointer
  // interactions stay quiet while keyboard users get a clear indicator.
  focusRing: {
    ...ringShape,
    outlineColor: {
      default: "transparent",
      ":focus-visible": color.borderAccent,
    },
  },
  // Same ring pulled inside the element's box, for use where an ancestor
  // clips overflow (e.g. a rounded card) and an outward ring would be cropped.
  focusRingInset: {
    ...ringShape,
    outlineColor: {
      default: "transparent",
      ":focus-visible": color.borderAccent,
    },
    outlineOffset: `calc(-1 * ${border.size_2})`,
  },
  // The ring on a frame around a control that has no frame of its own, such
  // as a bare text field. Put `stylex.defaultMarker()` on that control.
  // Firefox 120 does not support `:has()`, so there the frame rings while any
  // element in it has focus.
  focusRingWithin: {
    ...ringShape,
    outlineColor: {
      default: "transparent",
      [stylex.when.descendant(":focus-visible")]: color.borderAccent,
      "@supports not selector(:has(*))": {
        default: "transparent",
        ":focus-within": color.borderAccent,
      },
    },
  },
});
