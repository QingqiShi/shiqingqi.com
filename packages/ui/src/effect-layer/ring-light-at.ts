import {
  farthestOutlineParam,
  outlineLength,
  outlineParam,
  type OutlineBox,
} from "./outline-param.ts";

/**
 * Seconds the ring light runs, from where it starts until it has died out.
 *
 * @internal
 */
export const RING_SECONDS = 0.6;

/** Seconds the still glow shows under reduced motion. */
const HELD_SECONDS = 0.35;
const HELD_STRENGTH = 0.6;

/** How much of the outline a comet's tail covers, at full strength. */
const TAIL_SHARE = 0.4;

/** The first share of the ring's time, over which a comet lights up. */
const RISE = 0.08;

/** How sharply a comet slows to its stop. */
const COURSE_EASE = 3;

/**
 * A ring light that has started on an element: the time it started, on the
 * effect layer's clock, and the point it starts from, in page coordinates.
 * It starts at the point of the outline nearest to that point.
 *
 * @internal
 */
export interface RingLight {
  readonly start: number;
  readonly x: number;
  readonly y: number;
}

/**
 * The box a ring light runs around, in page coordinates.
 *
 * @internal
 */
export interface RingLightBox extends OutlineBox {
  readonly x: number;
  readonly y: number;
}

/**
 * One comet of the ring light, as a frame draws it.
 *
 * @internal
 */
export interface RingLightComet {
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
 * What one ring light draws this frame.
 *
 * @internal
 */
export interface RingLightState {
  readonly comets: readonly RingLightComet[];
  /** The strength of a still glow all around the outline, from 0 to 1. */
  readonly even: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * How far a comet has run, as a share of its course, at `progress` from 0
 * to 1 of the ring's time: fast at first, then slowing to a stop.
 *
 * @internal
 */
export function cometCourse(progress: number) {
  return 1 - (1 - clamp(progress, 0, 1)) ** COURSE_EASE;
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
  return rise * rise * (3 - 2 * rise) * (1 - progress ** 4);
}

/**
 * What a ring light draws at `time`, or `null` once it is over. Under
 * reduced motion no comet runs: a still glow shows for a moment instead.
 *
 * @internal
 */
export function ringLightAt(
  ring: RingLight,
  box: RingLightBox,
  time: number,
  reducedMotion: boolean,
): RingLightState | null {
  if (reducedMotion) {
    const held = time - ring.start;
    return held >= 0 && held < HELD_SECONDS
      ? { comets: [], even: HELD_STRENGTH }
      : null;
  }
  const progress = (time - ring.start) / RING_SECONDS;
  if (progress >= 1) {
    return null;
  }
  if (progress < 0) {
    return { comets: [], even: 0 };
  }
  const length = Math.max(outlineLength(box), 1);
  const x = ring.x - box.x;
  const y = ring.y - box.y;
  const origin = outlineParam(box, x, y) / length;
  const strength = cometStrength(progress);
  const course = cometCourse(progress);
  // The light splits into two comets that meet at the point of the outline farthest from where
  // the light started, each running its own way there at its own pace.
  const far = farthestOutlineParam(box, x, y) / length;
  const clockwise = (((far - origin) % 1) + 1) % 1;
  return {
    comets: [
      {
        head: origin + clockwise * course,
        direction: 1,
        strength,
        tail: TAIL_SHARE,
      },
      {
        head: origin - (1 - clockwise) * course,
        direction: -1,
        strength,
        tail: TAIL_SHARE,
      },
    ],
    even: 0,
  };
}

/**
 * When a ring light is over, in seconds on the effect layer's clock: under
 * reduced motion, the moment the still glow goes.
 *
 * @internal
 */
export function ringLightEnd(ring: RingLight, reducedMotion: boolean) {
  return ring.start + (reducedMotion ? HELD_SECONDS : RING_SECONDS);
}
