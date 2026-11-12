/**
 * One stone in a pond as the screen shows it in this frame: where it landed,
 * in the element's own px, and the slope of its rings at the time of the
 * frame.
 *
 * @internal
 */
export interface PondStoneView {
  readonly x: number;
  readonly y: number;
  readonly profile: Float32Array;
}

/**
 * The water of one pond as the screen shows it in this frame: the size of
 * the pond, in the element's own px, and each stone whose rings run in it.
 * The height of the water is the sum of the rings of all its stones.
 *
 * @internal
 */
export interface PondView {
  readonly width: number;
  readonly height: number;
  readonly stones: readonly PondStoneView[];
}

/**
 * The water at the time of this frame, or `null` while no ring runs.
 *
 * @internal
 */
type ShowPond = () => PondView | null;

const runs = new Map<Element, ShowPond>();
let wake = () => {};

/**
 * The rings that run in each element, so that the effect layer can bend
 * the element's content through the water and light it.
 *
 * @internal
 */
export const pondRuns = {
  get: (element: Element) => runs.get(element),
  set(element: Element, show: ShowPond) {
    runs.set(element, show);
    wake();
  },
  delete(element: Element) {
    runs.delete(element);
  },
  /** Calls `listener` each time rings start. Gives the function that stops it. */
  onStart(listener: () => void) {
    wake = listener;
    return () => {
      if (wake === listener) wake = () => {};
    };
  },
};
