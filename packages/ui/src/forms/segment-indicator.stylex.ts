import * as stylex from "@stylexjs/stylex";
import {
  duration,
  easing,
  motionConstants,
} from "../primitives/motion.stylex.ts";
import { color } from "../tokens.stylex.ts";

/**
 * Marks the track of a SegmentedControl or a TabBar, so its parts can follow
 * its state.
 *
 * @internal
 */
export const segmentTrackMarker = stylex.defineMarker();

const SELECTED_ANCHOR = "--segment-selected";
const NO_ANCHOR_POSITIONING = "@supports not (anchor-name: --x)";
/** The effect layer sets this attribute on the track while it draws the indicator. */
const DRAWN_BY_EFFECT = ":is([data-effect-drawn])";

/**
 * The indicator of a track of segments, which slides to the selected
 * segment: `base` on the indicator, `anchor` on the selected segment and
 * `track` on the track, so only its own segments can be the anchor. Where there is no anchor positioning, the indicator does
 * not show, so the selected segment paints its own surface there.
 *
 * @internal
 */
export const segmentIndicator = stylex.create({
  // The one element that carries the selected segment's surface. It follows
  // the anchor, so nothing measures a segment in JS.
  base: {
    position: "absolute",
    positionAnchor: SELECTED_ANCHOR,
    top: "anchor(top)",
    right: "anchor(right)",
    bottom: "anchor(bottom)",
    left: "anchor(left)",
    zIndex: -1,
    pointerEvents: "none",
    display: { default: null, [NO_ANCHOR_POSITIONING]: "none" },
    transition: {
      default: `top ${duration._300} ${easing.spring}, right ${duration._300} ${easing.spring}, bottom ${duration._300} ${easing.spring}, left ${duration._300} ${easing.spring}, opacity ${duration._400} ${easing.linear}`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
    // It keeps its box, its colours and its corners while the effect draws
    // in its place, so the effect can read them from it. It fades out while
    // the effect's glow fades in, so the change of shape does not jump.
    opacity: {
      default: null,
      [stylex.when.ancestor(DRAWN_BY_EFFECT, segmentTrackMarker)]: 0,
    },
    // The effect reads the colour of the ring light from the text colour.
    // The indicator has no text, so this colour does not show.
    color: color.bgAccent,
  },
  // A press holds the indicator off its anchor. Its top and bottom stay on
  // the anchor. On release it slides back to the anchor on the spring.
  at: (left: number, right: number) => ({
    left: `${String(left)}px`,
    right: `${String(right)}px`,
  }),
  dragged: {
    transition: "none",
  },
  anchor: {
    anchorName: SELECTED_ANCHOR,
  },
  // The track already sits behind the indicator, so a second blur only
  // repaints on each frame of the slide. Later in the indicator's `css`
  // array than `glassSurface.base`, so it wins.
  noBlur: {
    backdropFilter: "none",
  },
  // On the segments while a press holds the indicator under the pointer, so
  // no hover fill covers it.
  held: {
    backgroundColor: "transparent",
  },
  // On the track. `relative` makes it the indicator's containing block, so
  // only its own segments can be the anchor, and `isolate` keeps the
  // indicator's negative z-index inside it. A drag along the track moves the
  // indicator, and a swipe across it still scrolls the page.
  track: {
    position: "relative",
    isolation: "isolate",
    touchAction: "pan-y",
  },
});
