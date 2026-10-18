import * as stylex from "@stylexjs/stylex";

/** The "don't" specimen of `Text`: hard-coded pixels and opacity in place of the scale. */
export const hardCodedType = stylex.create({
  base: {
    fontSize: "11px",
    opacity: 0.5,
  },
});
