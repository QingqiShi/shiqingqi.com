import * as stylex from "@stylexjs/stylex";
import { color } from "@tuja/ui/color.stylex";

// `defineConsts` takes only literal values, so this repeats the value of
// `safeArea.blockStart` from `@tuja/ui/tokens.stylex`.
const SAFE_AREA_BLOCK_START =
  "max(0px, calc(env(safe-area-inset-top) - (100lvh - 100svh) * 9999))";

export const sceneHeight = stylex.defineConsts({
  phone: `calc(${SAFE_AREA_BLOCK_START} + clamp(20rem, 48svh, 26rem))`,
  wide: `calc(${SAFE_AREA_BLOCK_START} + clamp(22rem, 48svh, 30rem))`,
});

export const sceneTokens = stylex.defineVars({
  /** What the ground fades into in dark mode: the page under the scene. */
  seamFade: color.background,
});
