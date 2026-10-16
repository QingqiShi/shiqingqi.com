/**
 * The timeline of the Sheet's liquid drops, in ms: the drops rise and merge
 * into the wet card in `formMs`, the card sets from its centre out in
 * `setMs` while its content fades in, and on close the card breaks into
 * drops that fall off the screen in `breakMs`. The Sheet falls back to its
 * plain motion when the effect has not taken the card after `ackMs`.
 *
 * @internal
 */
export const SHEET_DROPS_TIMING = {
  formMs: 340,
  setMs: 160,
  breakMs: 300,
  ackMs: 400,
} as const;

/**
 * The attribute on a Sheet's mover that tells the drops effect what to do:
 * `rise` or `condense` to form the card, `break` to break it. The effect
 * answers `form` and `breaking` once it draws, and `set` as it hands back.
 *
 * @internal
 */
export const LIQUID_STATE = "data-liquid";

/**
 * The attribute on a Sheet's mover while the drops effect draws the card in
 * its place: the card hides its surface and its content.
 *
 * @internal
 */
export const LIQUID_HIDDEN = "data-liquid-hidden";
