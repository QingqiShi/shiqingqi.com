import * as stylex from "@stylexjs/stylex";

/**
 * Marks a Sheet's grabber, so that the bar inside it can follow the drawn
 * state the effect layer sets on the grabber.
 *
 * @internal
 */
export const liquidGrabberMarker = stylex.defineMarker();

/**
 * How far above the card a liquid grabber can go, in CSS px: as far as the
 * drop rises over the card's top edge when the card lands or a drag pulls
 * it up, with its light. The Sheet's canvas and the Effect stage read the
 * same value.
 *
 * @internal
 */
export const grabberReach = stylex.defineConsts({ rise: "28px" });
