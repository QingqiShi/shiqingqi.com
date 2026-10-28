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

/**
 * How the page shows. `standalone` is an app opened from the Home Screen,
 * which draws no browser controls over the page. In a browser tab, the
 * browser can draw its own controls in the safe area, as Safari does in the
 * side column of a screen with its status bar at the side.
 */
export const displayMode = stylex.defineConsts({
  standalone: "@media (display-mode: standalone)",
});
