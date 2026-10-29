import { clamp } from "../clamp.ts";
import { cornerRadius, outlineLength, outlineParam } from "./outline-param.ts";

/**
 * Seconds a lap runs, from where it starts until it has died out.
 *
 * @internal
 */
export const LAP_SECONDS = 1.3;

/** How much of the outline a lap's tail covers at most. */
const LAP_TAIL_SHARE = 0.35;

/** Seconds the still glow shows under reduced motion. */
const HELD_SECONDS = 0.35;
const HELD_STRENGTH = 0.6;

/** The first share of the ring's time, over which a comet lights up. */
const RISE = 0.08;

/** How sharply a comet slows to its stop. */
const COURSE_EASE = 3;

/**
 * The box a ring light runs around, in page coordinates, with round corners
 * of one radius. Lengths are CSS px.
 */
interface RingLightBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly radius: number;
}

/** The comet of a lap, as a frame draws it. */
interface RingLightComet {
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
  readonly comet: RingLightComet | null;
  /** The strength of a still glow all around the outline, from 0 to 1. */
  readonly even: number;
}

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
 * A lap of the ring light: one comet that runs once all the way round the
 * outline, from the point of the outline nearest to `(x, y)`, in page
 * coordinates, back to that point, fast at first, then slowing to a stop as
 * it fades. Its tail grows from nothing as it sets off. `start` is the time
 * it started, on the effect layer's clock. `direction` is 1 for clockwise.
 *
 * @internal
 */
export interface RingLap {
  readonly start: number;
  readonly x: number;
  readonly y: number;
  readonly direction: 1 | -1;
}

/**
 * What a lap draws at `time`, or `null` once it is over. Under reduced
 * motion no comet runs: a still glow shows for a moment instead.
 *
 * @internal
 */
export function ringLapAt(
  lap: RingLap,
  box: RingLightBox,
  time: number,
  reducedMotion: boolean,
): RingLightState | null {
  if (reducedMotion) {
    const held = time - lap.start;
    return held >= 0 && held < HELD_SECONDS
      ? { comet: null, even: HELD_STRENGTH }
      : null;
  }
  const progress = (time - lap.start) / LAP_SECONDS;
  if (progress >= 1) {
    return null;
  }
  if (progress < 0) {
    return { comet: null, even: 0 };
  }
  const radius = cornerRadius(box.width, box.height, box.radius);
  const length = Math.max(outlineLength(box.width, box.height, radius), 1);
  const origin =
    outlineParam(box.width, box.height, radius, lap.x - box.x, lap.y - box.y) /
    length;
  const course = cometCourse(progress);
  return {
    comet: {
      head: origin + lap.direction * course,
      direction: lap.direction,
      strength: cometStrength(progress),
      tail: Math.min(LAP_TAIL_SHARE, course),
    },
    even: 0,
  };
}

/**
 * When a lap is over, in seconds on the effect layer's clock: under reduced
 * motion, the moment the still glow goes.
 *
 * @internal
 */
export function ringLapEnd(lap: RingLap, reducedMotion: boolean) {
  return lap.start + (reducedMotion ? HELD_SECONDS : LAP_SECONDS);
}
