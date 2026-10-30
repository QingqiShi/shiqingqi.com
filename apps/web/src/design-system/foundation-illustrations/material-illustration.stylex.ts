import * as stylex from "@stylexjs/stylex";

export const materialIlloVars = stylex.defineVars({
  // The rim's own colour, under the light on it: a dark edge against a light
  // page, clear against a dark one — the reading `color.borderMaterialGlass` gives.
  rim: "light-dark(rgba(26, 26, 28, 0.38), rgba(255, 255, 255, 0))",
});
