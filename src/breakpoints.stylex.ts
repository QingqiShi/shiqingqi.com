import * as stylex from "@stylexjs/stylex";

export const breakpoints = stylex.defineConsts({
  sm: "@media (min-width: 320px)",
  md: "@media (min-width: 768px)",
  lg: "@media (min-width: 1080px)",
  xl: "@media (min-width: 2000px)",
});
