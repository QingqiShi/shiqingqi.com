import * as stylex from "@stylexjs/stylex";
import { backdropEffects, border } from "@/tokens.stylex";

export const glassSurfaceTokens = stylex.defineVars({
  borderRadius: border.radius_round,
  backdropFilter: backdropEffects.controls,
});
