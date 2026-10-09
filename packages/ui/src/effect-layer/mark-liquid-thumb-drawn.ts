/**
 * The event the Liquid thumb effect dispatches on a Switch when it starts to
 * draw the thumb in its place, with `detail` `true`, and when it stops, with
 * `detail` `false`. `useLiquidThumb` listens for it, so the Switch hides its
 * own thumb only while the effect draws one.
 *
 * @internal
 */
export const LIQUID_THUMB_DRAWN_EVENT = "liquidthumbdrawn";

/**
 * Tells a Switch whether the effect draws its thumb now.
 *
 * @internal
 */
export function markLiquidThumbDrawn(element: Element, drawn: boolean) {
  element.dispatchEvent(
    new CustomEvent(LIQUID_THUMB_DRAWN_EVENT, { detail: drawn }),
  );
}

/**
 * Whether an event is the effect saying that it draws the thumb now.
 *
 * @internal
 */
export function isLiquidThumbDrawn(event: Event) {
  return event instanceof CustomEvent && event.detail === true;
}
