import * as stylex from "@stylexjs/stylex";
import { handBack } from "../effect-layer/hand-back.stylex.ts";
import { movingMarker } from "../motion/moving-marker.stylex.ts";
import {
  duration,
  easing,
  motionConstants,
} from "../primitives/motion.stylex.ts";
import { color } from "../tokens.stylex.ts";

/**
 * The shadows of the selected surface of a SegmentedControl and of the
 * thumb of a Switch. The selected option is `bgControlRaised` on the
 * `bgControlSunken` track, with a hairline and a faint tight shadow. In dark
 * it has a ring instead of a shadow.
 *
 * @internal
 */
export const selectedSurface = stylex.defineVars({
  edge: "0 0 0 0.5px light-dark(rgba(0, 0, 0, 0.08), transparent), 0 1px 2px light-dark(rgba(0, 0, 0, 0.06), transparent), 0 2px 8px light-dark(rgba(0, 0, 0, 0.06), transparent), inset 0 0 0 1px light-dark(transparent, rgba(255, 255, 255, 0.1)), inset 0 1px 0 light-dark(transparent, rgba(255, 255, 255, 0.06))",
  thumbShadow:
    "0 0 0 0.5px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.18), 0 3px 8px rgba(0, 0, 0, 0.12)",
  thumbShadowHover:
    "0 0 0 0.5px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.22), 0 4px 12px rgba(0, 0, 0, 0.16)",
});

/**
 * Marks the track of a SegmentedControl, a TabBar or the rail of a TabView,
 * so its parts can follow its state.
 *
 * @internal
 */
export const segmentTrackMarker = stylex.defineMarker();

/**
 * The selected surface of a Segment track: the fill and the edge that the
 * indicator paints, and that the shown segment paints where the indicator
 * cannot show.
 *
 * @internal
 */
export const segmentSurface = stylex.defineVars({
  fill: "transparent",
  edge: "none",
});

const SELECTED_ANCHOR = "--segment-selected";
const NO_ANCHOR_POSITIONING = "@supports not (anchor-name: --x)";
/** The effect layer sets this attribute on the track while it draws the indicator. */
const DRAWN_BY_EFFECT = ":is([data-effect-drawn])";
/** The motion engine sets this attribute on a box while it moves it. */
const MOVED = ":is([data-moving])";

/**
 * The selected surface of each kind of Segment track, set on the track.
 *
 * @internal
 */
export const segmentSurfaces = stylex.create({
  // A SegmentedControl: the raised surface on the sunken track.
  solid: {
    [segmentSurface.fill]: color.bgControlRaised,
    [segmentSurface.edge]: selectedSurface.edge,
  },
  // A TabBar: a tint of the bar's own Glass.
  tint: {
    [segmentSurface.fill]: color.bgMaterialGlassSelected,
  },
  // The rail of a TabView, which sits on the canvas.
  flat: {
    [segmentSurface.fill]: color.bgControlRaised,
  },
});

/**
 * The parts of a Segment track, whose indicator slides to the selected
 * segment: `indicator` on the indicator, `shown` on the segment that looks
 * selected and `track` on the track, so only its own segments can be the
 * anchor. Where there is no anchor positioning, the indicator does not show,
 * so the shown segment paints the surface itself there.
 *
 * @internal
 */
export const segmentTrack = stylex.create({
  // The one element that carries the selected segment's surface. It follows
  // the anchor, so nothing measures a segment in JS.
  indicator: {
    position: "absolute",
    positionAnchor: SELECTED_ANCHOR,
    top: "anchor(top)",
    right: "anchor(right)",
    bottom: "anchor(bottom)",
    left: "anchor(left)",
    zIndex: -1,
    pointerEvents: "none",
    display: { default: null, [NO_ANCHOR_POSITIONING]: "none" },
    backgroundColor: segmentSurface.fill,
    boxShadow: segmentSurface.edge,
    transition: {
      default: `top ${duration._300} ${easing.spring}, right ${duration._300} ${easing.spring}, bottom ${duration._300} ${easing.spring}, left ${duration._300} ${easing.spring}, opacity ${handBack.duration} ${easing.linear}`,
      [stylex.when.ancestor(DRAWN_BY_EFFECT, segmentTrackMarker)]:
        `top ${duration._300} ${easing.spring}, right ${duration._300} ${easing.spring}, bottom ${duration._300} ${easing.spring}, left ${duration._300} ${easing.spring}`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
    // It keeps its box, its colours and its corners while the effect draws
    // in its place, so the effect can read them from it. The effect draws
    // only while the indicator moves or is pressed: it hides at once when
    // the effect takes over, and fades back in as the effect hands it back.
    opacity: {
      default: null,
      [stylex.when.ancestor(DRAWN_BY_EFFECT, segmentTrackMarker)]: 0,
    },
  },
  // A press holds the indicator off its anchor, along the track. Its sides
  // across the track stay on the anchor. On release it slides back to the
  // anchor on the spring.
  at: (left: number, right: number) => ({
    left: `${String(left)}px`,
    right: `${String(right)}px`,
  }),
  atBlock: (top: number, bottom: number) => ({
    top: `${String(top)}px`,
    bottom: `${String(bottom)}px`,
  }),
  dragged: {
    transition: "none",
  },
  // The segment that looks selected names the anchor and gives up its own
  // fill. Where there is no anchor positioning it paints the surface itself,
  // unless the effect draws the indicator over the track. WebKit moves a box
  // on the main thread while an anchor is in it. Thus while a motion moves a
  // box that holds the track, no segment is the anchor, and the shown segment
  // paints the surface at once.
  shown: {
    anchorName: {
      default: SELECTED_ANCHOR,
      [stylex.when.ancestor(MOVED, movingMarker)]: "none",
    },
    backgroundColor: {
      default: "transparent",
      [NO_ANCHOR_POSITIONING]: {
        default: segmentSurface.fill,
        [stylex.when.ancestor(DRAWN_BY_EFFECT, segmentTrackMarker)]:
          "transparent",
      },
      [stylex.when.ancestor(MOVED, movingMarker)]: segmentSurface.fill,
    },
    boxShadow: {
      default: "none",
      [NO_ANCHOR_POSITIONING]: {
        default: segmentSurface.edge,
        [stylex.when.ancestor(DRAWN_BY_EFFECT, segmentTrackMarker)]: "none",
      },
      [stylex.when.ancestor(MOVED, movingMarker)]: segmentSurface.edge,
    },
    transition: {
      default: null,
      [stylex.when.ancestor(MOVED, movingMarker)]: "none",
    },
  },
  // On the segments while a press holds the indicator under the pointer, so
  // no hover fill covers it.
  held: {
    backgroundColor: "transparent",
  },
  // `relative` makes the track the indicator's containing block, so only its
  // own segments can be the anchor, and `isolate` keeps the indicator's
  // negative z-index inside it. A drag along the track moves the indicator,
  // and a swipe across it still scrolls the page.
  track: {
    position: "relative",
    isolation: "isolate",
    touchAction: "pan-y",
  },
  // With `track`, on a track whose segments stand one over the next: a drag
  // down it moves the indicator, not the page.
  trackVertical: {
    touchAction: "pan-x",
  },
});
