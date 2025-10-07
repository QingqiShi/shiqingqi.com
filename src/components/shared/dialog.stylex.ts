import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@/breakpoints.stylex";

// CSS variables for responsive dialog animation values
export const dialogAnimationVars = stylex.defineVars({
  startingTransform: {
    default: "translateY(100dvh)",
    [breakpoints.md]: "translate(-50%, -50%) scale(0.95)",
  },
  openTransform: {
    default: "translateY(0)",
    [breakpoints.md]: "translate(-50%, -50%) scale(1)",
  },
  startingOpacity: {
    default: "1",
    [breakpoints.md]: "0",
  },
});
