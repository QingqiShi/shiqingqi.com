import {
  farthestOutlineParam,
  floodReach,
  outlineDistance,
  outlineLength,
  outlineParam,
  type OutlineBox,
} from "./outline-param.ts";

/**
 * Seconds the flood takes to cover the element, which CSS runs on the
 * element itself with `sweepConsts.floodDuration`.
 *
 * @internal
 */
export const FLOOD_SECONDS = 0.32;

/**
 * Seconds the ring light runs, from the flood reaching the edge until it
 * has died out.
 *
 * @internal
 */
export const RING_SECONDS = 0.6;

/** Seconds the still glow shows under reduced motion. */
const HELD_SECONDS = 0.35;
const HELD_STRENGTH = 0.6;

/**
 * How many comets the light splits into: one runs the whole outline and
 * dies where it started; two run opposite ways and meet on the far side.
 *
 * @internal
 */
export const COMET_COUNT: 1 | 2 = 2;

/** How much of the outline a comet's tail covers, at full strength. */
const TAIL_SHARE = { single: 0.3, split: 0.3 } as const;

/** The first share of the ring's time, over which a comet lights up. */
const RISE = 0.08;

/**
 * A Sweep that has started on an element: the time it started, on the
 * effect layer's clock, and where its flood starts from, in page
 * coordinates.
 *
 * @internal
 */
export interface Sweep {
  readonly start: number;
  readonly x: number;
  readonly y: number;
}

/**
 * The box a Sweep runs around, in page coordinates.
 *
 * @internal
 */
export interface SweepBox extends OutlineBox {
  readonly x: number;
  readonly y: number;
}

/**
 * One comet of the ring light, as a frame draws it.
 *
 * @internal
 */
export interface SweepComet {
  /** Where its head is, as a share of the outline from the top middle, clockwise. */
  readonly head: number;
  /** 1 clockwise, -1 anticlockwise. */
  readonly direction: 1 | -1;
  /** From 0 to 1. */
  readonly strength: number;
  /** How much of the outline its tail covers. */
  readonly tail: number;
}

/**
 * What one Sweep draws this frame.
 *
 * @internal
 */
export interface SweepState {
  readonly comets: readonly SweepComet[];
  /** The strength of a still glow all around the outline, from 0 to 1. */
  readonly even: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * How far the flood has travelled from its origin, at `progress` from 0 to
 * 1 of its duration. It leaves fast and slows down; the CSS flood runs
 * the same curve.
 *
 * @internal
 */
export function floodRadius(progress: number, reach: number) {
  return reach * (1 - (1 - clamp(progress, 0, 1)) ** 3);
}

/**
 * The progress at which the flood reaches `radius`: the inverse of
 * `floodRadius`.
 *
 * @internal
 */
export function floodProgressAt(radius: number, reach: number) {
  if (reach <= 0) {
    return 0;
  }
  return 1 - Math.cbrt(1 - clamp(radius / reach, 0, 1));
}

/**
 * How far a comet has run, as a share of its course, at `progress` from 0
 * to 1 of the ring's time: fast at first, then slowing to a stop.
 *
 * @internal
 */
export function cometCourse(progress: number) {
  return 1 - (1 - clamp(progress, 0, 1)) ** 2.2;
}

/**
 * How bright a comet is at `progress`: it lights up over the first few
 * percent, holds, then fades as it slows, and is gone at the end.
 *
 * @internal
 */
export function cometStrength(progress: number) {
  if (progress <= 0 || progress >= 1) {
    return 0;
  }
  const rise = Math.min(1, progress / RISE);
  return rise * rise * (3 - 2 * rise) * (1 - progress ** 2) ** 1.2;
}

/**
 * When the ring light starts: the moment the flood front first reaches
 * the outline, which is at the point of it nearest to the origin.
 *
 * @internal
 */
export function ringStart(sweep: Sweep, box: SweepBox) {
  const x = sweep.x - box.x;
  const y = sweep.y - box.y;
  const nearest = Math.max(0, -outlineDistance(box, x, y));
  return (
    sweep.start +
    FLOOD_SECONDS * floodProgressAt(nearest, floodReach(box, x, y))
  );
}

/**
 * What a Sweep draws at `time`, or `null` once it is over. Under reduced
 * motion no comet runs: a still glow shows for a moment instead.
 *
 * @internal
 */
export function sweepAt(
  sweep: Sweep,
  box: SweepBox,
  time: number,
  reducedMotion: boolean,
): SweepState | null {
  if (reducedMotion) {
    const held = time - sweep.start;
    return held >= 0 && held < HELD_SECONDS
      ? { comets: [], even: HELD_STRENGTH }
      : null;
  }
  const progress = (time - ringStart(sweep, box)) / RING_SECONDS;
  if (progress >= 1) {
    return null;
  }
  if (progress < 0) {
    return { comets: [], even: 0 };
  }
  const length = Math.max(outlineLength(box), 1);
  const x = sweep.x - box.x;
  const y = sweep.y - box.y;
  const origin = outlineParam(box, x, y) / length;
  const strength = cometStrength(progress);
  const course = cometCourse(progress);
  if (COMET_COUNT === 1) {
    return {
      comets: [
        {
          head: origin + course,
          direction: 1,
          strength,
          tail: TAIL_SHARE.single,
        },
      ],
      even: 0,
    };
  }
  // The two comets meet where the flood covers the box last, each running
  // its own way there at its own pace.
  const far = farthestOutlineParam(box, x, y) / length;
  const clockwise = (((far - origin) % 1) + 1) % 1;
  return {
    comets: [
      {
        head: origin + clockwise * course,
        direction: 1,
        strength,
        tail: TAIL_SHARE.split,
      },
      {
        head: origin - (1 - clockwise) * course,
        direction: -1,
        strength,
        tail: TAIL_SHARE.split,
      },
    ],
    even: 0,
  };
}

/**
 * When a Sweep next changes on its own without a frame following, in
 * seconds on the effect layer's clock, or `null`: under reduced motion, the
 * moment the still glow goes.
 *
 * @internal
 */
export function sweepEnd(sweep: Sweep, box: SweepBox, reducedMotion: boolean) {
  return reducedMotion
    ? sweep.start + HELD_SECONDS
    : ringStart(sweep, box) + RING_SECONDS;
}
