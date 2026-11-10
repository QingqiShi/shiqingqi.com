/**
 * The panel of one Slider as the screen shows it in this frame, in the
 * groove element's own px.
 *
 * - `size` is the size of the groove, in its own px, before a transform
 *   scales it.
 * - `inner` is the groove's inside, from the element's top-left corner:
 *   left, top, width, height. The panel starts at its left and fills its
 *   height.
 * - `edge` is the panel's far edge, from the left of `inner`, and
 *   `velocity` its speed, in px per second.
 * - `melt` is how far the panel has melted into liquid, from 0 solid to 1.
 * - `corner` is the radius of the panel's corners, and `cornerPower` their
 *   shape, as the power of a superellipse: 2 is a circle, 4 a squircle.
 * - `handle` is the line on the panel: its middle across, from the left of
 *   `inner`, half its width, and its top piece down from the top of
 *   `inner`. The bottom piece is the mirror of the top one across `center`.
 *
 * @internal
 */
export interface SliderLiquidView {
  readonly size: readonly [number, number];
  readonly inner: readonly [number, number, number, number];
  readonly edge: number;
  readonly velocity: number;
  readonly melt: number;
  readonly corner: number;
  readonly cornerPower: number;
  readonly handle: {
    readonly x: number;
    readonly radius: number;
    readonly center: number;
    readonly top: readonly [number, number];
  };
}

/**
 * The panel at the time of this frame.
 *
 * @internal
 */
export type ShowSliderLiquid = () => SliderLiquidView;

const runs = new Map<Element, ShowSliderLiquid>();
let wake = () => {};

/**
 * The Slider panels that are liquid now, so that the effect layer can draw
 * them. A Slider adds its groove when a press melts the panel, and takes it
 * away once the panel has set again.
 *
 * @internal
 */
export const sliderLiquidRuns = {
  get: (element: Element) => runs.get(element),
  set(element: Element, show: ShowSliderLiquid) {
    runs.set(element, show);
    wake();
  },
  delete(element: Element) {
    runs.delete(element);
  },
  /** Calls `listener` each time a panel melts. Gives the function that stops it. */
  onStart(listener: () => void) {
    wake = listener;
    return () => {
      if (wake === listener) wake = () => {};
    };
  },
};
