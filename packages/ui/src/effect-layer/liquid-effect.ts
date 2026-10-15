import { CAN_HOVER_QUERY } from "../can-hover-query.ts";
import { clamp } from "../clamp.ts";
import { smoothstep } from "../smoothstep.ts";
import {
  GPU_BUFFER_USAGE,
  GPU_MAP_MODE,
  GPU_SHADER_STAGE,
  PREMULTIPLIED_BLEND,
} from "./constants.ts";
import { createBinding } from "./create-binding.ts";
import { createPackedBuffer } from "./create-packed-buffer.ts";
import { roleBits } from "./effect-roles.ts";
import {
  EFFECT_SETTING_DEFAULTS,
  finiteOr,
} from "./effect-setting-defaults.ts";
import { handBack } from "./hand-back.stylex.ts";
import { instanceRange } from "./instance-range.ts";
import { leanLight, pointerOver, type LightContext } from "./lean-light.ts";
import type { PageRect } from "./lens-from-box.ts";
import { LIQUID_INDICATOR, LIQUID_SEGMENT } from "./liquid-indicator.ts";
import {
  LIQUID_INSTANCE_BYTES,
  LIQUID_WGSL,
  packLiquidInstances,
  type LiquidInstance,
  type TrackRing,
} from "./liquid-wgsl.ts";
import { markEffectDrawn } from "./mark-effect-drawn.ts";
import type { EffectColor } from "./parse-css-color.ts";
import {
  PIXEL_BYTES,
  PIXEL_COMPUTE_WGSL,
  PIXEL_DRAW_BYTES,
  PIXEL_WGSL,
  PIXEL_STEP_BYTES,
  PIXEL_WORKGROUP_SIZE,
  packPixelDraws,
  packPixelSteps,
  type PixelDraw,
  type PixelStep,
} from "./pixel-wgsl.ts";
import {
  readCornerExponent,
  readFill,
  resolveCornerRadii,
} from "./read-element-box.ts";
import { isLightBackdrop, srgbToOklab } from "./ripple-color.ts";
import {
  PILL_MOTION,
  type PillMotion,
  pillSettled,
  pillStretch,
  restingPill,
  stepPill,
} from "./step-pill.ts";
import {
  LIFETIME_VARY,
  MAX_PIXELS,
  pixelGrid,
  SHED_LIFETIME,
  speedShare,
  type PixelGrid,
  type PixelPill,
} from "./step-pixels.ts";
import { stepRise, type Rise } from "./step-rise.ts";
import type {
  Effect,
  EffectElementRecord,
  EffectFrame,
  EffectPass,
  EffectPointer,
  EffectSetup,
  EffectTarget,
} from "./types.ts";

const LIQUID = roleBits(["liquid"]);
/**
 * How many copies of the count buffer can be on their way back to the CPU
 * at once: one is read while the next is being copied, and a third covers
 * a map that takes a frame longer.
 */
const MAX_READBACKS = 3;
/**
 * A frame with no measured time, the first after the loop was idle, steps
 * this far.
 */
const FIRST_STEP = 1 / 60;

const px = (value: string) => finiteOr(Number.parseFloat(value), 0);

/**
 * Where the selected surface rests: a pill round `target`, with a straight
 * part `2 × span` long, in rest radii.
 *
 * @internal
 */
export interface Pill {
  readonly target: number;
  readonly span: number;
}

/**
 * A control the effect draws in, read from the page. A Switch's thumb is
 * an indicator with two stops: its off end and its on end.
 *
 * @internal
 */
export interface LiquidControl {
  /** The rest radius in CSS px. */
  readonly radius: number;
  /** The centre of a rest circle against the start of the track, in the page. */
  readonly originX: number;
  readonly originY: number;
  /** How far the selected surface can go along the track, in rest radii. */
  readonly travel: number;
  /** Where the selected surface rests at each position, in track space. */
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
  /** The selected surface's own edge, as `LiquidInstance.edge` takes it. */
  readonly edge: Edge;
  /** The accent that the glint and the shed pixels take. */
  readonly accent: EffectColor;
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

const NO_RING: TrackRing = { off: [0, 0, 0, 0], on: [0, 0, 0, 0], width: 0 };

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
 * The pill at `index`, a stop index that can be fractional: between two
 * stops, the target and the span go from one to the other.
 *
 * @internal
 */
export function pillAt(stops: readonly Pill[], index: number): Pill {
  const i = clamp(Math.floor(index), 0, Math.max(0, stops.length - 2));
  const from = stops[i];
  const to = stops.at(i + 1) ?? from;
  const t = clamp(index - i, 0, 1);
  return {
    target: from.target + (to.target - from.target) * t,
    span: from.span + (to.span - from.span) * t,
  };
}

/**
 * A Switch: its thumb from its `::before` and its own style, and the fill
 * its track takes when it toggles, from the colour of its `::after`. The
 * ring inside the track's edge is its first inset shadow, and the ring it
 * takes when it toggles is the border colour of its `::after`. A disabled
 * Switch keeps its own dimmed thumb.
 */
function readThumb(record: EffectElementRecord): LiquidControl | null {
  const { element } = record;
  const thumb = getComputedStyle(element, "::before");
  const own = getComputedStyle(element);
  const diameter = Number.parseFloat(thumb.width);
  if (
    !(diameter > 0) ||
    finiteOr(Number.parseFloat(own.opacity), 1) < 1 ||
    element.matches(":disabled")
  ) {
    return null;
  }
  const radius = diameter / 2;
  const travel = Math.max(0, record.width - record.height) / radius;
  const fill = readFill(own.backgroundColor);
  const afterStyle = getComputedStyle(element, "::after");
  const after = readFill(afterStyle.color);
  const other = after[3] > 0 ? after : fill;
  const on = (record.settings.liquid?.position ?? 0) >= 1;
  const color = readFill(thumb.backgroundColor);
  const ring = readInsetRing(own.boxShadow);
  const otherRing =
    after[3] > 0 ? readFill(afterStyle.borderTopColor) : ring?.color;
  return {
    radius,
    originX: record.x + record.height / 2,
    originY: record.y + record.height / 2,
    travel,
    stops: [
      { target: 0, span: 0 },
      { target: travel, span: 0 },
    ],
    color,
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
    accent: color,
  };
}

/**
 * A segmented control: one stop over each segment marked with
 * `LIQUID_SEGMENT`, whose boxes are `segments`, in a pill as long as the
 * segment, and the indicator's look, from the element marked with
 * `LIQUID_INDICATOR`. Its text colour is the accent.
 */
function readSegments(
  record: EffectElementRecord,
  segments: readonly DOMRect[],
): LiquidControl | null {
  const { element } = record;
  const indicator = element.querySelector(`[${LIQUID_INDICATOR}]`);
  const radius = (segments.at(0)?.height ?? 0) / 2;
  if (indicator === null || !(radius > 0)) {
    return null;
  }
  const own = getComputedStyle(element);
  const look = getComputedStyle(indicator);
  const box = element.getBoundingClientRect();
  // The rects are in the viewport, and the record in the page.
  const toPageX = record.x - box.left;
  const toPageY = record.y - box.top;
  const left = box.left + px(own.borderLeftWidth) + px(own.paddingLeft);
  const right = box.right - px(own.borderRightWidth) - px(own.paddingRight);
  const corners = [
    look.borderTopLeftRadius,
    look.borderTopRightRadius,
    look.borderBottomRightRadius,
    look.borderBottomLeftRadius,
  ] as const;
  return {
    radius,
    originX: left + radius + toPageX,
    originY: segments[0].top + radius + toPageY,
    travel: Math.max(0, (right - left) / radius - 2),
    stops: segments.map((segment) => {
      const start = (segment.left - left) / radius;
      const end = Math.max(start, (segment.right - left) / radius - 2);
      return { target: (start + end) / 2, span: (end - start) / 2 };
    }),
    color: readFill(look.backgroundColor),
    under: readFill(own.backgroundColor),
    fill: null,
    ring: null,
    corner: {
      radius: resolveCornerRadii(
        segments[0].width,
        segments[0].height,
        corners,
      )[0],
      exponent: readCornerExponent(
        look.getPropertyValue("corner-top-left-shape"),
      ),
    },
    thumb: false,
    edge: readEdge(look.boxShadow),
    accent: readFill(look.color),
  };
}

/**
 * Reads each control from the page, and reads it again only when it can
 * have changed: its element is measured again, a scroll moves it in the
 * page, it takes a new position, or one of its segments changes size. A
 * segment can change size in a track whose own box stays the same. Between
 * those, a frame reads nothing from the DOM, so it forces no layout. When a
 * segment changes size, it calls `onChange` for a frame to read it again.
 *
 * @internal
 */
export function createControlReader(onChange: () => void) {
  interface Watched {
    read: {
      readonly id: number;
      readonly measurement: number;
      readonly x: number;
      readonly y: number;
      readonly position: number | undefined;
      readonly control: LiquidControl | null;
    } | null;
    readonly observer: ResizeObserver;
    /** The box each segment had when it was read. */
    sizes: ReadonlyMap<Element, DOMRect>;
    /** The segments whose first notice has not come yet. */
    readonly starting: Set<Element>;
  }
  const controls = new Map<Element, Watched>();
  let used = new Set<Element>();

  function watch(element: Element) {
    const watched: Watched = {
      read: null,
      // The first notice for a segment gives its size when the watch
      // starts. Each later notice gives a new size.
      observer: new ResizeObserver((entries) => {
        const resized = entries.some(({ target, borderBoxSize }) => {
          if (!watched.starting.delete(target)) {
            return true;
          }
          const size = borderBoxSize.at(0);
          const read = watched.sizes.get(target);
          return (
            size?.inlineSize !== read?.width || size?.blockSize !== read?.height
          );
        });
        if (resized && watched.read !== null) {
          watched.read = null;
          onChange();
        }
      }),
      sizes: new Map(),
      starting: new Set(),
    };
    controls.set(element, watched);
    return watched;
  }

  function observe(
    watched: Watched,
    segments: readonly Element[],
    rects: readonly DOMRect[],
  ) {
    const { observer, sizes, starting } = watched;
    for (const segment of sizes.keys()) {
      if (!segments.includes(segment)) {
        observer.unobserve(segment);
        starting.delete(segment);
      }
    }
    for (const segment of segments) {
      if (!sizes.has(segment)) {
        starting.add(segment);
        observer.observe(segment, { box: "border-box" });
      }
    }
    watched.sizes = new Map(segments.map((segment, i) => [segment, rects[i]]));
  }

  return {
    read(record: EffectElementRecord) {
      const { element, id, measurement, x, y } = record;
      const position = record.settings.liquid?.position;
      used.add(element);
      const watched = controls.get(element) ?? watch(element);
      const { read } = watched;
      if (
        read?.id === id &&
        read.measurement === measurement &&
        read.x === x &&
        read.y === y &&
        read.position === position
      ) {
        return read.control;
      }
      const segments = [...element.querySelectorAll(`[${LIQUID_SEGMENT}]`)];
      const rects = segments.map((segment) => segment.getBoundingClientRect());
      const control = readSegments(record, rects) ?? readThumb(record);
      watched.read = { id, measurement, x, y, position, control };
      observe(watched, segments, rects);
      return control;
    },
    /** Stops watching each control that no read asked for since the last sweep. */
    sweep() {
      for (const [element, { observer }] of controls) {
        if (!used.has(element)) {
          observer.disconnect();
          controls.delete(element);
        }
      }
      used = new Set();
    },
    destroy() {
      for (const { observer } of controls.values()) {
        observer.disconnect();
      }
      controls.clear();
    },
  };
}

const rgb = (color: EffectColor) => [color[0], color[1], color[2]] as const;

/**
 * What the effect reads from the frame beside the control.
 *
 * @internal
 */
export interface LiquidContext extends LightContext {
  /** Device pixels per CSS px. */
  readonly pixelRatio: number;
}

/**
 * One control's selected surface between frames.
 *
 * @internal
 */
export interface LiquidState {
  /** How far the on fill has risen through the track, from 0 off to 1 on. */
  readonly rise: Rise;
  /** The stop index the surface rests at, at the last frame. */
  readonly position: number;
  /** The stop index a drag held the surface at, at the last frame, or `null`. */
  readonly drag: number | null;
  /** A pointer was down on the control at the last frame. */
  readonly pressed: boolean;
  /** The effect draws the body, in place of the control's own. */
  readonly active: boolean;
  /** When the effect started to hand the body back, or `null`. */
  readonly handFrom: number | null;
  /** The pill's centre, in rest radii, where the ends of the track let it be. */
  readonly x: number;
  /** How far the pointer leans the light, from 0 to 1, and the way to it. */
  readonly lean: number;
  readonly toPointer: readonly [number, number];
  /** The pixels while the pill moves. */
  readonly stream: PixelStream | null;
  /**
   * Half the straight part of the pill, in rest radii, when it was last
   * still. A new stream takes its cells from this pill, so a pill that
   * grows as it moves stretches its cells.
   */
  readonly restSpan: number;
  /** How much of the lit edge it draws, from 0 to 1. */
  readonly edgeLit: number;
  /** The pill has left its place, so it sweeps a glint when it lands. */
  readonly travelling: boolean;
  /** The glint: when it started, and the way the pill went. */
  readonly sweep: { readonly start: number; readonly heading: 1 | -1 } | null;
  /** The pill on its springs, its wind-up, and which way its move goes. */
  readonly pill: PillMotion | null;
  readonly windUp: WindUp | null;
  readonly heading: 1 | -1;
  /** Under reduced motion, the pill that fades out, and when it started. */
  readonly fade: {
    readonly x: number;
    readonly span: number;
    readonly start: number;
  } | null;
}

/**
 * The wind-up before a move: when it started, where the pill was, and how
 * many seconds it lasts. The move goes the way of `LiquidState.heading`.
 *
 * @internal
 */
export interface WindUp {
  readonly start: number;
  readonly from: number;
  readonly seconds: number;
}

/**
 * The pixels while the pill moves, in track space and CSS px.
 *
 * @internal
 */
export interface PixelStream {
  /** Each new set of pixels has its own number, which also seeds them. */
  readonly generation: number;
  readonly grid: PixelGrid;
  /** A pixel's size in device pixels. */
  readonly cell: number;
  /** Seconds since the pill started to move, and the steps taken. */
  readonly time: number;
  readonly tick: number;
  /**
   * The first step from which a count of no holes means the pill is whole,
   * or `null` while the pill still moves.
   */
  readonly stillFrom: number | null;
  /** The time by which every shed pixel has died. */
  readonly diesBy: number;
}

/**
 * How many of a stream's cells were holes after one of its steps, as the
 * GPU counted them.
 *
 * @internal
 */
export interface PixelCount {
  readonly generation: number;
  readonly tick: number;
  readonly moving: number;
}

/**
 * What the GPU last counted of a control's pixels, and where its pixels
 * are in the pixel buffer: `offset` gives the place of a stream's pixels,
 * and keeps it until the stream ends.
 *
 * @internal
 */
export interface PixelSlot {
  readonly counted: PixelCount | null;
  readonly offset: () => number;
}

/** @internal */
export interface PixelWork {
  readonly step: PixelStep | null;
  /** The CPU reads back the count of holes after the step. */
  readonly count: boolean;
  readonly draw: PixelDraw | null;
  readonly generation: number;
}

/**
 * Seconds the effect takes to hand the selected surface back to the
 * control.
 *
 * @internal
 */
export const HAND_SECONDS = Number.parseFloat(handBack.duration) / 1000;
/** The fill that rises through a track is as good as risen this near its goal. */
const RISE_SEEN = 0.03;
/** How far back the pill blurs: the seconds of its motion, and at most, in px. */
const SHUTTER = 0.02;
const SHUTTER_MOST = 48;
/** How far red and blue split from green on a full blur, as a share of it. */
const SPLIT = 0.12;
/** The glint sweeps the edge in this many seconds. */
const SWEEP_SECONDS = 0.32;
/** Under reduced motion, the surface fades from one pill to the next in this many seconds. */
const FADE_SECONDS = 0.15;
/** A pixel in device pixels, on a screen of at least 1.5 device pixels per CSS px, and on one of less. */
const PIXEL_CELL = { dense: 3, sparse: 2 } as const;
/**
 * A shed pixel takes this share of the accent, on a light page and on a
 * dark one, so a pale pixel shows on a pale track.
 */
const AWAY_TINT = { light: 0.35, dark: 0.25 } as const;
/**
 * On a dark page, each hole the shed pixels leave keeps a share of the
 * body, so that the holes do not read as a dark crescent: this share at the
 * trailing edge, and more further in, so the holes have no hard inner rim.
 */
const DARK_HOLE_FILL = [0.6, 1] as const;
const LIGHT_HOLE_FILL = [0, 0] as const;
/**
 * A pill slower than this, in px per second, is still: a move from it
 * winds up, and a drag does not turn the way it heads.
 */
const WIND_FROM_SPEED = 60;

/** A control at rest at `position`: the control draws the body. */
function restingState(
  target: number,
  span: number,
  position: number,
  drag: number | null,
): LiquidState {
  return {
    rise: { level: 0, speed: 0 },
    position,
    drag,
    pressed: false,
    active: false,
    handFrom: null,
    x: target,
    lean: 0,
    toPointer: [0, -1],
    stream: null,
    restSpan: span,
    edgeLit: 1,
    travelling: false,
    sweep: null,
    pill: null,
    windUp: null,
    heading: 1,
    fade: null,
  };
}

/**
 * How much of the body the effect draws while it hands the body back. The
 * control fades its own body in under the effect. An indicator that the
 * labels show through fades out at the same pace, so the two add up to
 * one. An opaque thumb stays whole until the control's is whole, because
 * two half-opaque thumbs over each other let the track through.
 */
function handAlpha(
  control: LiquidControl,
  active: boolean,
  handFrom: number | null,
  time: number,
) {
  if (!active) {
    return 0;
  }
  if (handFrom === null || control.thumb) {
    return 1;
  }
  return clamp(1 - (time - handFrom) / HAND_SECONDS, 0, 1);
}

/** The selected surface as it shows over the track: its fill over the track's. */
function solidOf(control: LiquidControl) {
  const { color, under } = control;
  const a = color[3];
  return [
    under[0] + (color[0] - under[0]) * a,
    under[1] + (color[1] - under[1]) * a,
    under[2] + (color[2] - under[2]) * a,
  ] as const;
}

/** The colour of a pixel away from its cell, premultiplied. */
function awayTint(
  control: LiquidControl,
  paint: readonly [number, number, number, number],
  lightPage: boolean,
) {
  const share = AWAY_TINT[lightPage ? "light" : "dark"];
  const accent = rgb(control.accent);
  return [
    paint[0] + (accent[0] - paint[0]) * share,
    paint[1] + (accent[1] - paint[1]) * share,
    paint[2] + (accent[2] - paint[2]) * share,
    paint[3] + (1 - paint[3]) * share,
  ] as const;
}

/** The selected surface's colour as a pixel draws it, premultiplied. */
function pixelPaint(control: LiquidControl) {
  const body = solidOf(control);
  if (control.thumb) {
    return [...body, 1] as const;
  }
  const under = rgb(control.under);
  const through = Math.min(
    1,
    ...body.map((channel, i) => channel / Math.max(under[i], 1e-3)),
  );
  return [
    body[0] - under[0] * through,
    body[1] - under[1] * through,
    body[2] - under[2] * through,
    1 - through,
  ] as const;
}

/** The colours a control's surface and pixels take over one backdrop. */
function paletteFor(control: LiquidControl, backdrop: EffectColor) {
  const solid = solidOf(control);
  const paint = pixelPaint(control);
  const lightPage = isLightBackdrop(backdrop);
  return {
    backdrop,
    solid,
    lightBody: srgbToOklab(solid)[0] > 0.7,
    lightPage,
    paint,
    tint: awayTint(control, paint, lightPage),
  };
}

const palettes = new WeakMap<LiquidControl, ReturnType<typeof paletteFor>>();

/**
 * The colours of `paletteFor`, worked out again only for a new read of the
 * control or a new backdrop.
 */
function paletteOf(control: LiquidControl, backdrop: EffectColor) {
  const cached = palettes.get(control);
  if (
    cached !== undefined &&
    cached.backdrop.every((channel, i) => channel === backdrop[i])
  ) {
    return cached;
  }
  const palette = paletteFor(control, backdrop);
  palettes.set(control, palette);
  return palette;
}

/**
 * The pill winds up before a move that starts from rest, and follows
 * through after it. A press with the pointer on a thumb winds it up for as
 * long as it lasts, so its release launches it at once. A drag has no
 * wind-up, since the finger starts the move. The pill lands on the first
 * step after the wind-up on which it arrives at its place, as `stepPill`
 * tells. A pill that has
 * settled and that nothing moves stays where it is, with no step.
 */
function followThrough(
  control: LiquidControl,
  previous: LiquidState,
  pill: PillMotion,
  input: {
    readonly target: number;
    readonly span: number;
    /** The pill rests at the last stop. */
    readonly last: boolean;
    readonly held: boolean;
    readonly pressed: boolean;
    readonly moved: boolean;
    readonly fromDrag: boolean;
    readonly wasPressed: boolean;
  },
  time: number,
  delta: number,
) {
  const { radius, thumb } = control;
  const { windUp: wind } = PILL_MOTION;
  let { windUp, heading } = previous;
  if (input.moved) {
    heading = input.target >= pill.x.value ? 1 : -1;
    const still = Math.abs(pill.x.speed) * radius < WIND_FROM_SPEED;
    const wound = thumb && input.wasPressed;
    windUp =
      still && !input.fromDrag && !wound
        ? {
            start: time,
            from: pill.x.value,
            seconds: wind.seconds[input.pressed ? "pointer" : "key"],
          }
        : null;
  }
  if (
    input.held ||
    (windUp !== null && time - windUp.start >= windUp.seconds)
  ) {
    windUp = null;
  }
  const lean =
    thumb && input.pressed && !input.held && windUp === null
      ? input.last
        ? -1
        : 1
      : 0;
  if (lean !== 0) {
    heading = lean;
  } else if (input.held && Math.abs(pill.x.speed) * radius > WIND_FROM_SPEED) {
    heading = pill.x.speed > 0 ? 1 : -1;
  }
  const depth = wind.depth[thumb ? "thumb" : "pill"] / radius;
  const goal =
    windUp === null
      ? input.target - lean * depth
      : windUp.from - heading * depth;
  const resting =
    !previous.active &&
    !input.moved &&
    !input.held &&
    !input.pressed &&
    windUp === null &&
    pillSettled(pill, input.target, input.span, radius);
  const stepped = resting
    ? {
        motion: pill,
        accel: 0,
        stretch: pillStretch(pill.deform.value),
        arrived: true,
      }
    : stepPill(
        pill,
        {
          goal,
          span: input.span,
          crouch: windUp !== null || lean !== 0 ? wind.crouch : 0,
          heading,
        },
        delta,
        radius,
      );
  // The pill cannot go past the ends of the track: it squashes against
  // them.
  const half = stepped.motion.span.value + 1;
  const reach = half * stepped.stretch[0];
  const from = Math.max(-1, stepped.motion.x.value - reach);
  const to = Math.min(control.travel + 1, stepped.motion.x.value + reach);
  const walled =
    from > stepped.motion.x.value - reach ||
    to < stepped.motion.x.value + reach;
  return {
    ...stepped,
    x: walled ? (from + to) / 2 : stepped.motion.x.value,
    stretch: walled
      ? pillStretch((to - from) / (2 * half) - 1)
      : stepped.stretch,
    windUp,
    heading,
    landed: stepped.arrived && goal === input.target,
    settled:
      windUp === null &&
      lean === 0 &&
      !input.held &&
      pillSettled(stepped.motion, input.target, input.span, radius),
    /** A press holds the thumb still in its lean, so no frame has to follow. */
    holding:
      lean !== 0 &&
      pillSettled(stepped.motion, goal, input.span, radius, wind.crouch),
  };
}

/**
 * Lays out one control's selected surface. At rest it is in the pill of
 * the stop at `position`, or where a drag holds it, and the control draws
 * it, with a lit edge from the effect over it. A new position moves the
 * pill there as `followThrough` tells: the effect draws it while it moves,
 * and blurs it over the last part of its motion. Its pixels stay in it,
 * but the faster it goes, the more its trailing edge sheds, as
 * `stepPixels` tells, and it grows back into the holes as it slows. It
 * sweeps a glint along its edge once as it lands. Once it rests and has no
 * holes, as the GPU counts them, the effect hands it back to the control.
 * The shed pixels draw on until the last one dies. Under reduced motion it
 * fades from one pill to the other.
 *
 * @internal
 */
export function layoutLiquid(
  control: LiquidControl,
  record: Pick<
    EffectElementRecord,
    "id" | "settings" | "x" | "y" | "width" | "height"
  >,
  elementIndex: number,
  state: LiquidState | undefined,
  frame: Pick<EffectFrame, "time" | "delta" | "reducedMotion">,
  backdrop: EffectColor,
  context: LiquidContext,
  pixels: PixelSlot,
): {
  state: LiquidState;
  instance: LiquidInstance;
  /** The effect draws the body, so the control hides its own. */
  drawn: boolean;
  /** Something moves, so the next frame must follow. */
  animating: boolean;
  /** The step of the pixels, and the pixels to draw. */
  pixels: PixelWork;
  /** Draw the next frame, though reduced motion asks for no frames. */
  fading: boolean;
} {
  const settings = record.settings.liquid ?? EFFECT_SETTING_DEFAULTS.liquid;
  const { radius, travel, stops, originX, originY, fill } = control;
  const last = stops.length - 1;
  const position = clamp(finiteOr(settings.position, 0), 0, last);
  const drag =
    settings.drag === null ? null : clamp(finiteOr(settings.drag, 0), 0, last);
  const held = drag !== null;
  const { target, span } = pillAt(stops, drag ?? position);
  const reduced = frame.reducedMotion;
  const delta = frame.delta > 0 ? frame.delta : FIRST_STEP;
  const previous = state ?? restingState(target, span, position, drag);
  const moved = state !== undefined && position !== state.position;
  const previousSpan =
    previous.pill?.span.value ??
    pillAt(stops, previous.drag ?? previous.position).span;

  let stream = reduced ? null : previous.stream;
  let { travelling, sweep, fade } = previous;
  const cell = context.pixelRatio >= 1.5 ? PIXEL_CELL.dense : PIXEL_CELL.sparse;

  const followed = reduced
    ? null
    : followThrough(
        control,
        previous,
        previous.pill ?? restingPill(previous.x, previousSpan),
        {
          target,
          span,
          last: position >= last,
          held,
          pressed: settings.pressed,
          moved,
          fromDrag: state !== undefined && state.drag !== null,
          wasPressed: state?.pressed ?? false,
        },
        frame.time,
        delta,
      );
  const x = followed?.x ?? target;
  const speed = (followed?.motion.x.speed ?? 0) * radius;
  const spanNow = followed?.motion.span.value ?? span;
  const stretch = followed?.stretch ?? ([1, 1] as const);
  const pillStill = followed === null ? !held : followed.settled;
  // A thumb that a press holds in its lean is still, but not at rest.
  const quiet = pillStill || followed?.holding === true;

  // The pill has left its place from a new position or a drag, and lands
  // once it arrives at its place. The glint runs then.
  if (reduced) {
    travelling = false;
    sweep = null;
  } else if (held || moved) {
    travelling = true;
    sweep = null;
  } else if (travelling && followed?.landed === true) {
    travelling = false;
    sweep = { start: frame.time, heading: speed >= 0 ? 1 : -1 };
  }
  const swept = sweep === null ? 1 : (frame.time - sweep.start) / SWEEP_SECONDS;
  if (swept >= 1) {
    sweep = null;
  }
  // A pill that has landed sheds nothing, and grows every hole back,
  // however fast it still moves as it settles.
  const shedSpeed = travelling ? speed : 0;

  // The pill is whole once the GPU counts no holes after a step on which
  // the pill was still. The pixels it shed live on after that, until the
  // last one dies.
  const { counted } = pixels;
  const whole =
    stream === null ||
    (counted !== null &&
      counted.generation === stream.generation &&
      counted.moving === 0 &&
      stream.stillFrom !== null &&
      counted.tick >= stream.stillFrom);
  if (stream !== null && whole && stream.time >= stream.diesBy) {
    stream = null;
  }
  const pill: PixelPill = {
    x: x * radius,
    span: spanNow * radius,
    radius,
  };
  // The GPU moves the pixels only from the first step that sheds, while
  // the pill moves or a shed pixel lives.
  if (followed !== null && stream === null && speedShare(shedSpeed) > 0) {
    stream = {
      generation: Math.round(frame.time * 1000) * 64 + (record.id % 64),
      grid: pixelGrid(
        { ...pill, span: previous.restSpan * radius },
        cell / context.pixelRatio,
      ),
      cell,
      time: 0,
      tick: 0,
      stillFrom: null,
      diesBy: 0,
    };
  }

  const offset = stream === null ? 0 : pixels.offset();
  let step: PixelStep | null = null;
  if (followed !== null && stream !== null) {
    step = {
      offset,
      grid: stream.grid,
      pill,
      speed: shedSpeed,
      push: followed.accel,
      stretch,
      time: stream.time,
      delta,
      tick: stream.tick,
      seed: stream.generation,
      corner: control.corner?.radius ?? radius,
    };
    const time = stream.time + delta;
    stream = {
      ...stream,
      time,
      tick: stream.tick + 1,
      stillFrom: quiet ? (stream.stillFrom ?? stream.tick) : null,
      diesBy:
        speedShare(shedSpeed) > 0
          ? time + SHED_LIFETIME * (1 + LIFETIME_VARY)
          : stream.diesBy,
    };
  }

  if (reduced) {
    if (moved) {
      fade = { x: previous.x, span: previousSpan, start: frame.time };
    }
    if (fade !== null && frame.time - fade.start >= FADE_SECONDS) {
      fade = null;
    }
  } else {
    fade = null;
  }

  // The track's fill, for a Switch.
  const level = fill !== null && position === last ? 1 : 0;
  const riseGoal =
    fill === null ? 0 : held && travel > 0 ? clamp(x / travel, 0, 1) : level;
  const rise =
    state === undefined
      ? { level, speed: 0 }
      : stepRise(state.rise, riseGoal, delta, reduced);

  const atRest =
    pillStill && whole && Math.abs(rise.level - riseGoal) < RISE_SEEN;
  let { active, handFrom } = previous;
  if (reduced) {
    active = fade !== null;
    handFrom = null;
  } else if (!atRest) {
    active = true;
    handFrom = null;
  } else if (active && handFrom === null) {
    handFrom = frame.time;
  } else if (active && frame.time - (handFrom ?? 0) >= HAND_SECONDS) {
    active = false;
    handFrom = null;
  }
  const fadeIn =
    fade === null ? 1 : clamp((frame.time - fade.start) / FADE_SECONDS, 0, 1);
  const body = handAlpha(control, active, handFrom, frame.time) * fadeIn;

  const lit = leanLight(
    context,
    previous,
    { x: originX + x * radius, y: originY },
    record,
    delta,
    reduced,
  );
  // The lit edge is off while the pill moves fast, and comes back as it
  // lands.
  const edgeGoal = 1 - smoothstep(150, 500, Math.abs(speed));
  const edgeLit = reduced
    ? 1
    : edgeGoal < previous.edgeLit
      ? edgeGoal
      : Math.min(edgeGoal, previous.edgeLit + delta / HAND_SECONDS);
  const blur =
    !reduced && !quiet
      ? clamp(speed * SHUTTER, -SHUTTER_MOST, SHUTTER_MOST)
      : 0;
  const half = (spanNow + 1) * radius;

  const { solid, lightBody, lightPage, paint, tint } = paletteOf(
    control,
    backdrop,
  );
  const instance: LiquidInstance = {
    elementIndex,
    radius,
    originX,
    originY,
    thumb: solid,
    lightBody,
    off: rgb(fill?.off ?? control.under),
    on: rgb(fill?.on ?? control.under),
    ring: control.ring ?? NO_RING,
    rise: rise.level,
    riseGoal,
    cover: fill !== null && active,
    seeThrough: !control.thumb,
    corner: control.corner,
    backdrop: rgb(backdrop),
    body,
    pill: [pill.x, pill.span, ...stretch],
    leaving:
      fade === null
        ? [0, 0, 0]
        : [fade.x * radius, fade.span * radius, 1 - fadeIn],
    light: lit.light,
    accent: rgb(control.accent),
    edge: control.edge,
    edgeLit,
    grid:
      stream === null
        ? [0, 1, 1, 0]
        : [offset, stream.grid.cols, stream.grid.rows, 1],
    holeFill: lightPage ? LIGHT_HOLE_FILL : DARK_HOLE_FILL,
    motion: [
      blur,
      SPLIT * smoothstep(2, 12, Math.abs(blur)),
      sweep === null ? 0 : sweep.heading * half * (2.2 * swept - 1.1),
      sweep === null ? 0 : Math.sin(Math.PI * swept),
    ],
  };
  // A stream draws its shed pixels only while one can be alive.
  const draw: PixelDraw | null =
    stream === null || stream.diesBy <= stream.time
      ? null
      : {
          elementIndex,
          offset,
          count: stream.grid.cols * stream.grid.rows,
          cell: stream.cell,
          originX,
          originY,
          time: stream.time,
          color: paint,
          shadow: [0, 0, 0, lightPage || control.thumb ? 0.1 : 0.2],
          light: lightBody ? [0, 0, 0] : [0.16, 0.16, 0.16],
          tint,
        };
  return {
    state: {
      rise,
      position,
      drag,
      pressed: settings.pressed,
      active,
      handFrom,
      x,
      lean: lit.lean,
      toPointer: lit.toPointer,
      stream,
      restSpan: quiet ? spanNow : previous.restSpan,
      edgeLit,
      travelling,
      sweep,
      fade,
      pill: followed?.motion ?? null,
      windUp: followed?.windUp ?? null,
      heading: followed?.heading ?? previous.heading,
    },
    instance,
    drawn: active && handFrom === null,
    animating:
      !reduced &&
      ((active && !(followed?.holding === true && stream === null)) ||
        stream !== null ||
        !lit.resting ||
        sweep !== null ||
        edgeLit !== edgeGoal),
    pixels: {
      step,
      count: stream !== null && stream.stillFrom !== null && !whole,
      draw,
      generation: stream?.generation ?? 0,
    },
    fading: reduced && fade !== null,
  };
}

/** The most streams that move in one frame. */
const MAX_PIXEL_STEPS = 64;

/**
 * The GPU side of the pixels: the pixel buffer, with a slot of room for
 * `MAX_PIXELS` for each stream, the compute pass that moves them, the count
 * of holes that comes back to the CPU, and the draw of the shed pixels.
 */
function createPixels(setup: EffectSetup) {
  const { device, format, pageLayout, targetLayout } = setup;
  const usage =
    GPU_BUFFER_USAGE.STORAGE |
    GPU_BUFFER_USAGE.COPY_DST |
    GPU_BUFFER_USAGE.COPY_SRC;
  let capacity = 0;
  let buffer = device.createBuffer({ size: PIXEL_BYTES * 4, usage });
  const binding = {
    get buffer() {
      return buffer;
    },
  };
  const computeLayout = device.createBindGroupLayout({
    entries: (["read-only-storage", "storage", "storage"] as const).map(
      (type, index) => ({
        binding: index,
        visibility: GPU_SHADER_STAGE.COMPUTE,
        buffer: { type },
      }),
    ),
  });
  const renderLayout = device.createBindGroupLayout({
    entries: [0, 1].map((index) => ({
      binding: index,
      visibility: GPU_SHADER_STAGE.VERTEX | GPU_SHADER_STAGE.FRAGMENT,
      buffer: { type: "read-only-storage" as const },
    })),
  });
  const simulate = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [computeLayout] }),
    compute: {
      module: device.createShaderModule({ code: PIXEL_COMPUTE_WGSL }),
      entryPoint: "simulate",
    },
  });
  const renderModule = device.createShaderModule({ code: PIXEL_WGSL });
  const render = device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [pageLayout, targetLayout, renderLayout],
    }),
    vertex: { module: renderModule, entryPoint: "pixelVertex" },
    fragment: {
      module: renderModule,
      entryPoint: "pixelFragment",
      targets: [{ format, blend: PREMULTIPLIED_BLEND }],
    },
    primitive: { topology: "triangle-strip" },
  });
  const stepBuffer = createPackedBuffer(
    device,
    PIXEL_STEP_BYTES,
    packPixelSteps,
  );
  const drawBuffer = createPackedBuffer(
    device,
    PIXEL_DRAW_BYTES,
    packPixelDraws,
  );
  const countBuffer = device.createBuffer({
    size: MAX_PIXEL_STEPS * 4,
    usage,
  });
  const computeBinding = createBinding(device, computeLayout, [
    stepBuffer,
    binding,
    { buffer: countBuffer },
  ]);
  const renderBinding = createBinding(device, renderLayout, [
    drawBuffer,
    binding,
  ]);
  const latest = new Map<number, PixelCount>();
  const slots = new Map<number, number>();
  const freeSlots: number[] = [];
  const readbacks: { readonly buffer: GPUBuffer; busy: boolean }[] = [];
  let draws: PixelDraw[] = [];
  let destroyed = false;

  /** Makes room for `count` slots, and keeps the pixels in the slots that there are. */
  function ensureCapacity(count: number) {
    if (count <= capacity) {
      return;
    }
    const old = buffer;
    const oldCapacity = capacity;
    capacity = 2 ** Math.ceil(Math.log2(count));
    buffer = device.createBuffer({
      size: capacity * MAX_PIXELS * PIXEL_BYTES,
      usage,
    });
    // The copy must occur before this frame writes to the new buffer.
    // Thus the copy goes to the queue now, and not in the frame's encoder.
    if (oldCapacity > 0) {
      const copy = device.createCommandEncoder();
      copy.copyBufferToBuffer(old, 0, buffer, 0, old.size);
      device.queue.submit([copy.finish()]);
    }
    old.destroy();
  }

  /**
   * Copies the counts of this frame's steps back to the CPU, without
   * waiting for them, for the steps whose count is wanted.
   */
  function readBack(
    encoder: GPUCommandEncoder,
    stepped: readonly {
      id: number;
      generation: number;
      tick: number;
      count: boolean;
    }[],
  ) {
    if (!stepped.some(({ count }) => count)) {
      return;
    }
    let readback = readbacks.find((candidate) => !candidate.busy);
    if (readback === undefined) {
      if (readbacks.length >= MAX_READBACKS) {
        return;
      }
      readback = {
        buffer: device.createBuffer({
          size: MAX_PIXEL_STEPS * 4,
          usage: GPU_BUFFER_USAGE.MAP_READ | GPU_BUFFER_USAGE.COPY_DST,
        }),
        busy: false,
      };
      readbacks.push(readback);
    }
    const { buffer: target } = readback;
    const size = stepped.length * 4;
    readback.busy = true;
    encoder.copyBufferToBuffer(countBuffer, 0, target, 0, size);
    // The effect layer submits this encoder right after the update, in
    // the same task. A map requested before that submit would not wait
    // for the copy, so the request goes in a microtask, which runs after
    // the submit.
    queueMicrotask(() => {
      target.mapAsync(GPU_MAP_MODE.READ, 0, size).then(
        () => {
          if (!destroyed) {
            const counts = new Uint32Array(target.getMappedRange(0, size));
            for (const [
              index,
              { id, generation, tick, count },
            ] of stepped.entries()) {
              const before = latest.get(id);
              if (
                count &&
                slots.has(id) &&
                (before === undefined ||
                  before.generation !== generation ||
                  before.tick <= tick)
              ) {
                latest.set(id, { generation, tick, moving: counts[index] });
              }
            }
            target.unmap();
          }
          readback.busy = false;
        },
        () => {
          readback.busy = false;
        },
      );
    });
  }

  return {
    binding,
    /** The control's slot, which the first call for a stream gives it. */
    slotOf(id: number): PixelSlot {
      return {
        counted: latest.get(id) ?? null,
        offset: () => {
          let slot = slots.get(id);
          if (slot === undefined) {
            slot = freeSlots.pop() ?? slots.size;
            slots.set(id, slot);
            ensureCapacity(slot + 1);
          }
          return slot * MAX_PIXELS;
        },
      };
    },
    /** Frees the control's slot, once it has no stream. */
    forget(id: number) {
      latest.delete(id);
      const slot = slots.get(id);
      if (slot !== undefined) {
        slots.delete(id);
        freeSlots.push(slot);
      }
    },
    update(
      encoder: GPUCommandEncoder,
      work: readonly { id: number; work: PixelWork }[],
    ) {
      const steps: PixelStep[] = [];
      const stepped: {
        id: number;
        generation: number;
        tick: number;
        count: boolean;
      }[] = [];
      for (const {
        id,
        work: { step, count, generation },
      } of work) {
        if (step === null || steps.length >= MAX_PIXEL_STEPS) {
          continue;
        }
        steps.push(step);
        stepped.push({ id, generation, tick: step.tick, count });
      }
      draws = work.flatMap(({ work: { draw } }) =>
        draw === null ? [] : [draw],
      );
      drawBuffer.write(draws);
      if (steps.length === 0) {
        return;
      }
      stepBuffer.write(steps);
      encoder.clearBuffer(countBuffer, 0, steps.length * 4);
      const pass = encoder.beginComputePass();
      pass.setPipeline(simulate);
      pass.setBindGroup(0, computeBinding());
      const most = Math.max(...steps.map(({ grid }) => grid.cols * grid.rows));
      pass.dispatchWorkgroups(
        Math.ceil(most / PIXEL_WORKGROUP_SIZE),
        steps.length,
      );
      pass.end();
      readBack(encoder, stepped);
    },
    draw(pass: EffectPass, target: EffectTarget) {
      const [first, count] = instanceRange(
        draws,
        target.firstElement,
        target.elementCount,
      );
      if (count === 0) {
        return;
      }
      pass.setPipeline(render);
      pass.setBindGroup(2, renderBinding());
      for (let index = first; index < first + count; index++) {
        const draw = draws[index];
        pass.draw(4, draw.count, index * 8, draw.offset);
        pass.draw(4, draw.count, index * 8 + 4, draw.offset);
      }
    },
    destroy() {
      destroyed = true;
      buffer.destroy();
      stepBuffer.destroy();
      drawBuffer.destroy();
      countBuffer.destroy();
      for (const readback of readbacks) {
        readback.buffer.destroy();
      }
    },
  };
}

/**
 * Liquid: draws the selected surface of each control with the role, a
 * Switch's thumb or a segmented control's indicator, while it moves, in
 * the colour and at the size of the one the control draws itself, as
 * `useLiquid` describes. On a Switch it also covers the track with the
 * fill that rises or sinks under it. It marks the control with
 * `markEffectDrawn` while it draws the surface, so the control hides its
 * own only then. At rest it draws only a lit edge over the control's own
 * surface. It asks for frames only while something moves, or while the
 * pointer is near a control.
 *
 * The surface's pixels live on the GPU, in a slot of the pixel buffer for
 * each control that sheds, from its first step that sheds until its last
 * shed pixel dies. A compute pass moves them each frame the surface moves
 * or a shed pixel lives, and the render passes draw them from it. The
 * CPU reads back how many cells are holes, without waiting, so it knows a
 * frame or so late when the surface is whole.
 *
 * @internal
 */
export const liquidEffect: Effect = {
  async setup(setup) {
    const { device, format, pageLayout, targetLayout } = setup;
    const liquidLayout = device.createBindGroupLayout({
      entries: [0, 1].map((binding) => ({
        binding,
        visibility: GPU_SHADER_STAGE.VERTEX | GPU_SHADER_STAGE.FRAGMENT,
        buffer: { type: "read-only-storage" as const },
      })),
    });
    const liquidModule = device.createShaderModule({ code: LIQUID_WGSL });
    const liquidPipeline = await device.createRenderPipelineAsync({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [pageLayout, targetLayout, liquidLayout],
      }),
      vertex: { module: liquidModule, entryPoint: "liquidVertex" },
      fragment: {
        module: liquidModule,
        entryPoint: "liquidFragment",
        targets: [{ format, blend: PREMULTIPLIED_BLEND }],
      },
      primitive: { topology: "triangle-strip" },
    });

    const instanceBuffer = createPackedBuffer(
      device,
      LIQUID_INSTANCE_BYTES,
      packLiquidInstances,
    );
    const pixels = createPixels(setup);
    const liquidBinding = createBinding(device, liquidLayout, [
      instanceBuffer,
      pixels.binding,
    ]);

    const states = new Map<number, LiquidState>();
    const controlReader = createControlReader(setup.requestFrame);
    const drawn = new Set<Element>();
    let instances: readonly LiquidInstance[] = [];
    const hoverQuery = window.matchMedia(CAN_HOVER_QUERY);
    /** The boxes of the controls at the last frame, and whether a pointer leaned a light. */
    let boxes: readonly PageRect[] = [];
    let leaning = false;

    return {
      // A pointer that moves near a control leans its light, and one that
      // leaves takes the lean away.
      followsPointer: (pointer: EffectPointer) =>
        leaning ||
        boxes.some((box) =>
          pointerOver({ pointer, hoverable: hoverQuery.matches }, box),
        ),
      update(encoder, frame) {
        const context: LiquidContext = {
          pointer: frame.pointer,
          hoverable: hoverQuery.matches,
          viewport: frame.viewport,
          pixelRatio: window.devicePixelRatio,
        };
        const controls = frame.elements.flatMap((record, index) => {
          if ((record.roles & LIQUID) === 0) {
            return [];
          }
          const control = controlReader.read(record);
          return control === null ? [] : [{ index, record, control }];
        });
        controlReader.sweep();
        const nextInstances: LiquidInstance[] = [];
        const seen = new Set<Element>();
        const kept = new Set<number>();
        const pixelWork: { id: number; work: PixelWork }[] = [];
        let animating = false;
        let fading = false;
        leaning = false;
        for (const { index, record, control } of controls) {
          const { id } = record;
          const laid = layoutLiquid(
            control,
            record,
            index,
            states.get(id),
            frame,
            frame.scopes[record.scopeIndex].backdrop,
            context,
            pixels.slotOf(id),
          );
          if (laid.state.stream === null) {
            pixels.forget(id);
          }
          pixelWork.push({ id, work: laid.pixels });
          fading ||= laid.fading;
          leaning ||= laid.state.lean > 0;
          if (laid.drawn) {
            seen.add(record.element);
          }
          kept.add(id);
          states.set(id, laid.state);
          nextInstances.push(laid.instance);
          animating ||= laid.animating;
        }
        boxes = controls.map(({ record }) => record);
        for (const id of states.keys()) {
          if (!kept.has(id)) {
            states.delete(id);
            pixels.forget(id);
          }
        }
        for (const element of drawn) {
          if (!seen.has(element)) {
            drawn.delete(element);
            markEffectDrawn(element, false);
          }
        }
        instances = nextInstances;
        instanceBuffer.write(nextInstances);
        pixels.update(encoder, pixelWork);
        for (const element of seen) {
          if (!drawn.has(element)) {
            drawn.add(element);
            markEffectDrawn(element, true);
          }
        }
        // Under reduced motion the layer asks for no frames, but a fade
        // needs them to finish.
        if (fading) {
          setup.requestFrame();
        }
        return animating;
      },
      draw(pass, target) {
        const [first, count] = instanceRange(
          instances,
          target.firstElement,
          target.elementCount,
        );
        if (count > 0) {
          pass.setPipeline(liquidPipeline);
          pass.setBindGroup(2, liquidBinding());
          pass.draw(4, count, 0, first);
        }
        pixels.draw(pass, target);
      },
      destroy() {
        controlReader.destroy();
        for (const element of drawn) {
          markEffectDrawn(element, false);
        }
        drawn.clear();
        instanceBuffer.destroy();
        pixels.destroy();
      },
    };
  },
};
