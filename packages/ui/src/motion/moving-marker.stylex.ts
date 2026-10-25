import * as stylex from "@stylexjs/stylex";

/**
 * Marks a box that the motion engine moves, such as the card of a Sheet,
 * so that its content can change while the box has `data-moving`.
 *
 * @internal
 */
export const movingMarker = stylex.defineMarker();
