import * as stylex from "@stylexjs/stylex";
import { color } from "../color.stylex.ts";
import { controlSize } from "../tokens.stylex.ts";

export const sliderTokens = stylex.defineVars({
  // Where the thumb is, as a share of its travel, from the current value.
  position: "0",
  // `size` variants set this value; the thumb and its travel derive from it.
  trackHeight: controlSize._7,
  fillColor: color.bgControlStrong,
  thumbShadow: "none",
  // The room between the thumb and the edge of the track, on all sides.
  rim: "3px",
  // The width of the thumb: a pill wider than it is tall.
  thumbWidth: "0px",
});
