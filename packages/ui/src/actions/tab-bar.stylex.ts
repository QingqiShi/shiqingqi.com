import * as stylex from "@stylexjs/stylex";
import { space } from "../tokens.stylex.ts";

/**
 * The TabBar's dial, set the way `cornerTokens.height` is. `blockSize` is
 * the height of the pill, for a page that keeps its content clear of a bar
 * that floats over it.
 */
export const tabBarTokens = stylex.defineVars({
  blockSize: space._9,
});
