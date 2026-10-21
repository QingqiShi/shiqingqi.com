import * as stylex from "@stylexjs/stylex";
import { duration } from "../primitives/motion.stylex.ts";
import { controlHeight } from "../tokens.stylex.ts";

export const switchTokens = stylex.defineVars({
  thumbPosition: "0",
  thumbShadow: "none",
  thumbTransitionDuration: duration._200,
  // Track height sets the switch's scale; width follows the 2:1 ratio, and the
  // thumb derives from it. `size` variants set this value.
  trackHeight: controlHeight.md,
});
