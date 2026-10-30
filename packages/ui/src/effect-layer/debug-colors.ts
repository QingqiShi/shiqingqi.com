/** @internal */
export type Rgb = readonly [number, number, number];

/**
 * The colours of the debug view.
 *
 * @internal
 */
export const DEBUG_COLORS = {
  slots: [
    [0.86, 0.16, 0.55],
    [0, 0.6, 0.86],
  ],
  marker: [0.5, 0.5, 0.5],
  documentElement: [0.1, 0.7, 0.2],
  fixedElement: [1, 0.5, 0],
  container: [0.55, 0.25, 0.95],
  pointer: [0.9, 0.1, 0.2],
} as const satisfies Record<string, Rgb | readonly Rgb[]>;

/**
 * The most rects the minimap draws: the track, two placed bands, two drawn
 * parts and the viewport.
 *
 * @internal
 */
export const MAX_RECTS = 6;
