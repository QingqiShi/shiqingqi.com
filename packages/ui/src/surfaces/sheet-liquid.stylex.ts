import * as stylex from "@stylexjs/stylex";

/**
 * Marks a Sheet's mover, so that the card and its content can follow the
 * attributes the liquid drops set on it.
 *
 * @internal
 */
export const sheetLiquidMarker = stylex.defineMarker();

/**
 * How far the Sheet's Effect stage canvas reaches past the card, in CSS px:
 * above it, past each side, and below it, where the drops rise from below
 * the screen and fall off it.
 *
 * @internal
 */
export const sheetLiquidReach = stylex.defineConsts({
  rise: "16px",
  spill: "8px",
  fall: "200px",
});
