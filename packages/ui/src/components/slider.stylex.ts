import * as stylex from "@stylexjs/stylex";
import { controlSize } from "../tokens.stylex.ts";

export const sliderTokens = stylex.defineVars({
  // Filled share of the track, as a percentage. Set per render from the current
  // value so the track gradient and the thumb travel stay in step.
  fill: "0%",
  // The two knobs the `size` variants set; every other dimension derives from
  // them. `md` is the default control height.
  trackHeight: controlSize._2,
  thumbSize: controlSize._5,
});
