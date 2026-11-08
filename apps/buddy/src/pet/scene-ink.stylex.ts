import * as stylex from "@stylexjs/stylex";

/**
 * The scene's own ink and paper, for the bubble and for the corner marks over the sky. The sky is
 * day or night whatever the page's theme, so these never follow the theme's tokens.
 */
export const sceneInk = stylex.defineConsts({
  ink: "#3B2A1A",
  paper: "#FFF8EC",
  markFill: "rgba(24, 18, 12, 0.36)",
  markFillPressed: "rgba(24, 18, 12, 0.52)",
});
