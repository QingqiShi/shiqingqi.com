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
 * The attribute of a Segment track whose segments are boxes of any size,
 * such as the rows of a list: the liquid rests in the box of each segment,
 * a rectangle with the indicator's corners, and the effect draws nothing
 * while the indicator rests.
 *
 * @internal
 */
export const LIQUID_BOX = "data-liquid-box";
