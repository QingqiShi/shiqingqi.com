import * as stylex from "@stylexjs/stylex";
import { controlSize } from "../../tokens.stylex.ts";

export const sliderTokens = stylex.defineVars({
  // Set per render from the current value, keeping the track gradient and
  // thumb travel in sync.
  fill: "0%",
  // `size` variants set these two; every other dimension derives from them.
  trackHeight: controlSize._2,
  thumbSize: controlSize._5,
});
