import * as stylex from "@stylexjs/stylex";

/**
 * `px` / `py` are the pointer position across the tile (0 -> 1, 0.5 = centre),
 * which `IlloLayer` writes while the tile is hovered; `mx` / `my` are the same
 * position centred (-1 -> 1, 0 at rest), which `IlloLayer` derives from them
 * and the illustration reads to lean towards the cursor.
 */
export const illoVars = stylex.defineVars({
  px: "0.5",
  py: "0.5",
  mx: "0",
  my: "0",
});
