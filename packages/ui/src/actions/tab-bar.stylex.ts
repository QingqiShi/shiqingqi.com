import * as stylex from "@stylexjs/stylex";
import { color, font, space } from "../tokens.stylex.ts";

/**
 * The TabBar's dial, set the way `cornerTokens.height` is. `blockSize` is
 * the height of the pill, for a page that keeps its content clear of a bar
 * that floats over it.
 */
export const tabBarTokens = stylex.defineVars({
  blockSize: space._9,
});

/** The tab of a TabBar or of the rail of a TabView that looks selected. */
export const tabLink = stylex.create({
  // The colour and the filled icon are the signal in forced colours.
  shown: {
    color: color.fgControlSelected,
    fontWeight: font.weight_6,
  },
});
