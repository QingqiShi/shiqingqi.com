import * as stylex from "@stylexjs/stylex";

/**
 * The band the Sheet edge draws in, from the card's border box: `rise`
 * above the top edge, as far as the swell and its light can go; `depth`
 * below it, far enough that the card's fill can start below the wet part
 * of the band, on solid colour; `spill` past each side; and `fillStart`,
 * how far below the top edge the card paints its own fill while the effect
 * draws the edge: below the wet part even at the sides, where the water
 * follows the corner's arc down. The Sheet's styles and the effect read
 * the same values.
 *
 * @internal
 */
export const sheetEdge = stylex.defineConsts({
  rise: "32px",
  depth: "96px",
  spill: "4px",
  fillStart: "80px",
});
