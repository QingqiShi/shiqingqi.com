/**
 * The attribute of the element inside a Segment track that draws the
 * indicator: the effect draws in its place, with its colours, its corners
 * and its shadow.
 *
 * @internal
 */
export const LIQUID_INDICATOR = "data-liquid-indicator";

/**
 * The attribute of each segment inside a Segment track, such as a radio or
 * a link: the liquid rests in a pill as long as the segment.
 *
 * @internal
 */
export const LIQUID_SEGMENT = "data-liquid-segment";

/**
 * The attribute of a Segment track whose segments stand one over the next,
 * such as the rail of a TabView: the liquid moves down the track, and the
 * width of a segment is the height of its pill.
 *
 * @internal
 */
export const LIQUID_VERTICAL = "data-liquid-vertical";

/**
 * The attribute of the thumb inside the track of a Slider: the effect draws
 * in its place, with its size and its colour.
 *
 * @internal
 */
export const LIQUID_THUMB = "data-liquid-thumb";

/**
 * The attribute of the fill inside the track of a Slider, which ends under
 * the middle of the thumb: the liquid shows the track through itself with
 * this colour before its rest place.
 *
 * @internal
 */
export const LIQUID_FILL = "data-liquid-fill";
