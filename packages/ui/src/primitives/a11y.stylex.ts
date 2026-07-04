import * as stylex from "@stylexjs/stylex";
import { color } from "../tokens.stylex.ts";

/**
 * Accessibility primitives shared across components.
 *
 * `srOnly` hides content visually while keeping it in the accessibility tree
 * (screen-reader-only labels). `focusRing`/`focusRingInset` paint the shared
 * keyboard focus indicator (WCAG 2.4.7) on `:focus-visible` — use `focusRing`
 * by default, and `focusRingInset` where an ancestor clips overflow so an
 * outward ring would be cropped.
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
    outlineWidth: "2px",
    outlineStyle: "solid",
    outlineColor: { default: "transparent", ":focus-visible": color.accent },
    outlineOffset: "2px",
  },
  // Same ring pulled inside the element's box, for use where an ancestor
  // clips overflow (e.g. a rounded card) and an outward ring would be cropped.
  focusRingInset: {
    outlineWidth: "2px",
    outlineStyle: "solid",
    outlineColor: { default: "transparent", ":focus-visible": color.accent },
    outlineOffset: "-2px",
  },
});
