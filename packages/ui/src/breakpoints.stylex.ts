import * as stylex from "@stylexjs/stylex";

export const breakpoints = stylex.defineConsts({
  sm: "@media (min-width: 320px)",
  md: "@media (min-width: 768px)",
  lg: "@media (min-width: 1080px)",
  xl: "@media (min-width: 2000px)",
});

export const pointer = stylex.defineConsts({
  // `(pointer: fine)` is necessary because some Android phones also report
  // `(hover: hover)`. A touchscreen laptop keeps its hover styles, because
  // its primary pointer is a mouse or a trackpad.
  canHover: "@media (hover: hover) and (pointer: fine)",
  coarse: "@media (pointer: coarse)",
});
