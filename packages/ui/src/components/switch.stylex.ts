import * as stylex from "@stylexjs/stylex";
import { controlSize } from "../tokens.stylex.ts";

export const switchTokens = stylex.defineVars({
  thumbPosition: "0",
  thumbShadow: "none",
  thumbTransitionDuration: "0.2s",
  // The track height, and thus the whole switch's scale — width follows via the
  // 2:1 aspect ratio and the thumb is derived from it. The `size` variants set
  // this per size; `controlSize._9` is the historic (md) default.
  trackHeight: controlSize._9,
});
