import * as stylex from "@stylexjs/stylex";

/**
 * The values every illustration reads. `ink` is the rest state, and the
 * `hue` / `hueSoft` gold pair is the alive state; a card can re-set the pair
 * on its `<svg>` (color sets it to purple).
 *
 * `px` / `py` are the pointer position across the tile (0 -> 1, 0.5 = centre),
 * which `IlloLayer` writes while the tile is hovered; `mx` / `my` are the same
 * position centred (-1 -> 1, 0 at rest), which `IlloLayer` derives from them.
 */
export const illoVars = stylex.defineVars({
  ink: "light-dark(#6f6f6c, #a9a8a4)",
  hue: "light-dark(#9a7b32, #d8b269)",
  hueSoft: "light-dark(#bd9a4e, #f0d29a)",
  px: "0.5",
  py: "0.5",
  mx: "0",
  my: "0",
});

/** Shared base for every illustration's root `<svg>`. */
export const illoBase = stylex.create({
  svg: {
    display: "block",
    inlineSize: "100%",
    blockSize: "100%",
  },
});
