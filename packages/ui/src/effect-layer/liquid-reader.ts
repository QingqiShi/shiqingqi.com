import type { MeasureContext } from "./create-element-tracker.ts";
import { finiteOr } from "./effect-setting-defaults.ts";
import {
  LIQUID_BOX,
  LIQUID_INDICATOR,
  LIQUID_SEGMENT,
  LIQUID_VERTICAL,
} from "./liquid-indicator.ts";
import type { TrackRing } from "./liquid-instance-value.ts";
import type { EffectColor } from "./parse-css-color.ts";
import {
  readCornerExponent,
  readFill,
  resolveCornerRadii,
  type ElementBox,
} from "./read-element-box.ts";
import type { RoleReader } from "./read-roles.ts";

const px = (value: string) => finiteOr(Number.parseFloat(value), 0);

/**
 * Where the liquid rests: a pill round `target`, with a straight part
 * `2 × span` long, in rest radii. A box with rounded corners is also
 * straight across, from `low` to `high`.
 *
 * @internal
 */
export interface Pill {
  readonly target: number;
  readonly span: number;
  readonly low?: number;
  readonly high?: number;
}

/**
 * A control the liquid draws in, read from the page. A Switch's thumb is
 * an indicator with two stops: its off end and its on end.
 *
 * @internal
 */
export interface LiquidControl {
  /** The rest radius in CSS px. */
  readonly radius: number;
  /**
   * The centre of a rest circle against the start of the track, from the
   * top-left corner of the control's box.
   */
  readonly originX: number;
  readonly originY: number;
  /** How far the liquid can go along the track, in rest radii. */
  readonly travel: number;
  /** Where the liquid rests at each position, in track space. */
  readonly stops: readonly Pill[];
  /** The selected surface's colour, and the fill of the track under it at rest. */
  readonly color: EffectColor;
  readonly under: EffectColor;
  /** The fills the track goes from and to as the on fill rises through it, or `null` for none. */
  readonly fill: { readonly off: EffectColor; readonly on: EffectColor } | null;
  /** The ring inside the track's edge, off and on, which changes with the fill, or `null` for none. */
  readonly ring: TrackRing | null;
  /** The corners of the rest shape, where they are not those of a pill. */
  readonly corner?: { readonly radius: number; readonly exponent: number };
  /**
   * The selected surface is a Switch's thumb. Else it is an indicator that
   * the track shows through.
   */
  readonly thumb: boolean;
  /** The selected surface's own edge, as `LiquidInstanceRecord.edge` takes it. */
  readonly edge: Edge;
  /** How far the liquid's surface swells past its rest shape, in CSS px. */
  readonly spread: number;
  /**
   * The track runs down the page, as `LiquidInstanceRecord.vertical` describes.
   * Else it runs along it.
   */
  readonly vertical?: boolean;
  /**
   * The liquid rests in the box of each segment, as `LIQUID_BOX` describes,
   * and the effect draws nothing once the control has its surface back.
   */
  readonly box?: boolean;
}

/**
 * The opacity of a selected surface's ring, of its two shadows, and of its
 * inset ring.
 *
 * @internal
 */
export type Edge = readonly [number, number, number, number];

/**
 * The edge of a Switch's thumb at rest. The thumb's shadow changes on hover,
 * with a transition, so the effect does not read it from the thumb.
 */
const THUMB_EDGE: Edge = [0.06, 0.18, 0.12, 0];

const COLOR_FUNCTION = /[a-z-]+\([^)]*\)/i;

/**
 * The edge from a computed `box-shadow`: the opacity of its first three
 * outer shadows, a ring and two shadows, and of its first inset shadow, a
 * ring. `none` is no edge.
 *
 * @internal
 */
export function readEdge(boxShadow: string): Edge {
  const outer: number[] = [];
  const inset: number[] = [];
  for (const shadow of boxShadow.split(/,(?![^(]*\))/)) {
    const color = COLOR_FUNCTION.exec(shadow)?.[0];
    const opacity = color === undefined ? 0 : readFill(color)[3];
    (/\binset\b/.test(shadow) ? inset : outer).push(opacity);
  }
  return [
    outer.at(0) ?? 0,
    outer.at(1) ?? 0,
    outer.at(2) ?? 0,
    inset.at(0) ?? 0,
  ];
}

const LENGTH = /-?\d*\.?\d+px/g;

/**
 * The colour and the width of the first ring inside in a computed
 * `box-shadow`: an inset shadow with no offset and no blur. `null` is no
 * ring.
 *
 * @internal
 */
export function readInsetRing(
  boxShadow: string,
): { readonly color: EffectColor; readonly width: number } | null {
  for (const shadow of boxShadow.split(/,(?![^(]*\))/)) {
    if (!/\binset\b/.test(shadow)) {
      continue;
    }
    const color = COLOR_FUNCTION.exec(shadow)?.[0];
    const lengths = (
      shadow.replace(COLOR_FUNCTION, "").match(LENGTH) ?? []
    ).map(px);
    const spread = lengths.at(3) ?? 0;
    if (color !== undefined && lengths.slice(0, 3).every((l) => l === 0)) {
      return spread > 0 ? { color: readFill(color), width: spread } : null;
    }
  }
  return null;
}

/**
 * A Switch: its thumb from its `::before` and its own style, and the fill
 * its track takes when it toggles, from the colour of its `::after`. The
 * ring inside the track's edge is its first inset shadow, and the ring it
 * takes when it toggles is the border colour of its `::after`. Its own
 * fill and ring are those of its checked state, and the ones of its
 * `::after` are those of the other state. A disabled Switch keeps its own
 * dimmed thumb.
 */
function readThumb(
  element: Element,
  box: ElementBox,
  { styleOf }: MeasureContext,
): LiquidControl | null {
  const thumb = getComputedStyle(element, "::before");
  const own = styleOf(element);
  const diameter = Number.parseFloat(thumb.width);
  if (
    !(diameter > 0) ||
    finiteOr(Number.parseFloat(own.opacity), 1) < 1 ||
    element.matches(":disabled")
  ) {
    return null;
  }
  const radius = diameter / 2;
  const travel = Math.max(0, box.width - box.height) / radius;
  const fill = readFill(own.backgroundColor);
  const afterStyle = getComputedStyle(element, "::after");
  const after = readFill(afterStyle.color);
  const other = after[3] > 0 ? after : fill;
  const on = element.matches(":checked");
  const ring = readInsetRing(own.boxShadow);
  const otherRing =
    after[3] > 0 ? readFill(afterStyle.borderTopColor) : ring?.color;
  return {
    radius,
    originX: box.height / 2,
    originY: box.height / 2,
    travel,
    stops: [
      { target: 0, span: 0 },
      { target: travel, span: 0 },
    ],
    color: readFill(thumb.backgroundColor),
    under: fill,
    fill: on ? { off: other, on: fill } : { off: fill, on: other },
    ring:
      ring === null || otherRing === undefined
        ? null
        : {
            off: on ? otherRing : ring.color,
            on: on ? ring.color : otherRing,
            width: ring.width,
          },
    thumb: true,
    edge: THUMB_EDGE,
    spread: px(own.paddingTop),
  };
}

const segmentsOf = (element: Element) =>
  element.querySelectorAll(`[${LIQUID_SEGMENT}]`);

/**
 * A segmented control: one stop over each segment marked with
 * `LIQUID_SEGMENT`, in a pill as long as the segment, and the indicator's
 * look, from the element marked with `LIQUID_INDICATOR`. On a track marked
 * with `LIQUID_VERTICAL` the stops go down the track, and the pill is as
 * long as the segment is tall. On a track marked with `LIQUID_BOX` each
 * stop is the box of its segment, and the rest radius is half the shortest
 * side of a segment that shows.
 */
function readSegments(
  element: Element,
  box: ElementBox,
  { styleOf, rectOf }: MeasureContext,
): LiquidControl | null {
  const indicator = element.querySelector(`[${LIQUID_INDICATOR}]`);
  const vertical = element.hasAttribute(LIQUID_VERTICAL);
  const inBox = element.hasAttribute(LIQUID_BOX);
  // A vertical track is read in the frame that `liquidShader` turns it to,
  // mirrored over the diagonal, so the code below reads only the horizontal case.
  const frame = vertical ? turn : (rect: Box) => rect;
  const side = vertical ? TURNED_SIDES : SIDES;
  const boxes = [...segmentsOf(element)].map((segment) =>
    frame(rectOf(segment)),
  );
  // A segment that does not show, such as a row of a closed group, has no
  // box.
  const shown = inBox
    ? boxes.filter((segment) => segment.width > 0 && segment.height > 0)
    : boxes;
  const first = shown.at(0);
  const radius = inBox
    ? Math.min(
        ...shown.map((segment) => Math.min(segment.width, segment.height)),
      ) / 2
    : (first?.height ?? 0) / 2;
  if (first === undefined || indicator === null || !(radius > 0)) {
    return null;
  }
  const own = styleOf(element);
  const look = styleOf(indicator);
  const track = frame({
    left: box.x,
    right: box.x + box.width,
    top: box.y,
    bottom: box.y + box.height,
    width: box.width,
    height: box.height,
  });
  const left =
    track.left +
    px(own[`border${side.left}Width`]) +
    px(own[`padding${side.left}`]);
  const right =
    track.right -
    px(own[`border${side.right}Width`]) -
    px(own[`padding${side.right}`]);
  // The top-right corner in the frame is the indicator's bottom-left.
  const corners = vertical
    ? ([
        look.borderTopLeftRadius,
        look.borderBottomLeftRadius,
        look.borderBottomRightRadius,
        look.borderTopRightRadius,
      ] as const)
    : ([
        look.borderTopLeftRadius,
        look.borderTopRightRadius,
        look.borderBottomRightRadius,
        look.borderBottomLeftRadius,
      ] as const);
  const along = left + radius;
  const across = inBox ? (track.top + track.bottom) / 2 : first.top + radius;
  return {
    radius,
    originX: (vertical ? across : along) - box.x,
    originY: (vertical ? along : across) - box.y,
    travel: Math.max(0, (right - left) / radius - 2),
    stops: boxes.map((segment) => {
      const start = (segment.left - left) / radius;
      const end = Math.max(start, (segment.right - left) / radius - 2);
      const pill = { target: (start + end) / 2, span: (end - start) / 2 };
      if (!inBox) {
        return pill;
      }
      const middle = ((segment.top + segment.bottom) / 2 - across) / radius;
      const girth = Math.max(0, segment.height / radius / 2 - 1);
      return { ...pill, low: middle - girth, high: middle + girth };
    }),
    color: readFill(look.backgroundColor),
    under: readFill(own.backgroundColor),
    fill: null,
    ring: null,
    corner: {
      radius: resolveCornerRadii(first.width, first.height, corners)[0],
      exponent: readCornerExponent(
        look.getPropertyValue("corner-top-left-shape"),
      ),
    },
    thumb: false,
    edge: readEdge(look.boxShadow),
    spread: px(own[`padding${side.top}`]),
    vertical,
    box: inBox,
  };
}

type Box = Pick<
  DOMRectReadOnly,
  "left" | "right" | "top" | "bottom" | "width" | "height"
>;

/** `rect` mirrored over the diagonal through the origin. */
function turn(rect: Box): Box {
  return {
    left: rect.top,
    right: rect.bottom,
    top: rect.left,
    bottom: rect.right,
    width: rect.height,
    height: rect.width,
  };
}

const SIDES = { left: "Left", right: "Right", top: "Top" } as const;
/** The sides of the page that `turn` puts at each side of the frame. */
const TURNED_SIDES = { left: "Top", right: "Bottom", top: "Left" } as const;

/**
 * What the liquid reads of a control: a segmented control, or else a
 * Switch, or `null` when it can draw in neither. A segment can change size
 * in a track whose own box stays the same, so the tracker observes each
 * segment too.
 *
 * @internal
 */
export const liquidReader: RoleReader<LiquidControl | null> = {
  read: (element, box, context) =>
    readSegments(element, box, context) ?? readThumb(element, box, context),
  observe: segmentsOf,
};
