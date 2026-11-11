import * as stylex from "@stylexjs/stylex";
import { font, space } from "../tokens.stylex.ts";

/**
 * The sizes of a `Stat` that a `StatGroup` changes with its own width: in a
 * narrow group, two stats share a row, so the value and the card padding
 * step down.
 *
 * @internal
 */
export const statTokens = stylex.defineVars({
  valueSize: font.uiHeading1,
  cardPadding: space._4,
});
