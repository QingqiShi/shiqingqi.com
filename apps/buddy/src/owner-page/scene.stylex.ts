import * as stylex from "@stylexjs/stylex";
import { color } from "@tuja/ui/color.stylex";

export const sceneHeight = stylex.defineConsts({
  phone: "calc(env(safe-area-inset-top) + clamp(20rem, 48svh, 26rem))",
  wide: "calc(env(safe-area-inset-top) + clamp(22rem, 48svh, 30rem))",
});

export const sceneTokens = stylex.defineVars({
  /** What the ground fades into in dark mode: the page under the scene. */
  seamFade: color.bgCanvas,
});
