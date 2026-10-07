import * as stylex from "@stylexjs/stylex";
import { border, color } from "../tokens.stylex.ts";

/**
 * Strips the browser's button chrome and puts back what every control needs:
 * the pointer cursor and the system focus ring, the same ring as
 * `a11y.focusRing`. Compose `a11y.focusRingInset` after it where an ancestor
 * clips overflow.
 */
export const buttonReset = stylex.create({
  base: {
    appearance: "none",
    borderWidth: 0,
    borderStyle: "none",
    backgroundColor: "transparent",
    padding: 0,
    cursor: "pointer",
    // A primitive cannot compose another primitive, so this is a copy of
    // `a11y.focusRing`. `focus-ring.test.ts` keeps the copy the same as the
    // original.
    outlineWidth: border.size_2,
    outlineStyle: "solid",
    outlineColor: {
      default: "transparent",
      ":focus-visible": color.borderAccent,
    },
    outlineOffset: border.size_2,
  },
});
