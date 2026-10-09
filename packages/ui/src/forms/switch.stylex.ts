import * as stylex from "@stylexjs/stylex";
import { duration } from "../primitives/motion.stylex.ts";
import { controlSize } from "../tokens.stylex.ts";

export const switchTokens = stylex.defineVars({
  thumbPosition: "0",
  thumbShadow: "none",
  thumbTransitionDuration: duration._200,
  // Track height sets the switch's scale; width follows the 2:1 ratio, and the
  // thumb derives from it. `size` variants set this value — `controlSize._9`
  // is the historic `md` default.
  trackHeight: controlSize._9,
  // The Sweep flood: where it starts, in the track's own space, how far it
  // travels to cover the track, and how far along it is. The progress is a
  // registered number, so that a keyframe animation interpolates it.
  sweepX: "0px",
  sweepY: "0px",
  sweepReach: "0px",
  sweepProgress: stylex.types.number(0),
});
