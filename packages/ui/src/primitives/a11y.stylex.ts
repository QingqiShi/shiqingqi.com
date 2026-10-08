import * as stylex from "@stylexjs/stylex";
import { pointer } from "../breakpoints.stylex.ts";
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
 *
 * `touchTarget` gives a control the touch feel of the system: no tap flash, no
 * double-tap zoom delay, and, under a coarse pointer, a hit area of at least
 * 44px (WCAG 2.5.8) that does not change how the control looks.
 * `buttonReset.base` and `chipSurface.interactive` already carry it.
 * `cardSurface.interactive` carries all of it except the hit area.
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
  // The hit area is an `::after` that extends past the box to 44px in each
  // axis and stays below the content. The control becomes its containing
  // block and a stacking context only under a coarse pointer, so a mouse sees
  // no change. Compose it before a style that sets `position`, or that style
  // loses its value.
  touchTarget: {
    WebkitTapHighlightColor: "transparent",
    touchAction: "manipulation",
    position: { default: null, [pointer.coarse]: "relative" },
    isolation: { default: null, [pointer.coarse]: "isolate" },
    "::after": {
      content: { default: null, [pointer.coarse]: '""' },
      position: "absolute",
      inset: "min(0px, calc(50% - 22px))",
      zIndex: -1,
    },
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
