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

/** Where a running light is, in the frame `lightAt` passes to its comets. */
interface LightRun {
  /** From 0 to 1 of the light's time. */
  readonly progress: number;
  /** The length of the outline, never 0. */
  readonly length: number;
  /** Where the light starts, in box coordinates. */
  readonly x: number;
  readonly y: number;
  /** The point of the outline nearest to the start, as a share of it. */
  readonly origin: number;
}

function lightAt(
  light: RingLight,
  box: RingLightBox,
  time: number,
  reducedMotion: boolean,
  seconds: number,
  cometsOf: (run: LightRun) => RingLightComet[],
): RingLightState | null {
  if (reducedMotion) {
    const held = time - light.start;
    return held >= 0 && held < HELD_SECONDS
      ? { comets: [], even: HELD_STRENGTH }
      : null;
  }
  const progress = (time - light.start) / seconds;
  if (progress >= 1) {
    return null;
  }
  if (progress < 0) {
    return { comets: [], even: 0 };
  }
  const length = Math.max(outlineLength(box), 1);
  const x = light.x - box.x;
  const y = light.y - box.y;
  const origin = outlineParam(box, x, y) / length;
  return { comets: cometsOf({ progress, length, x, y, origin }), even: 0 };
}

function lightEnd(light: RingLight, reducedMotion: boolean, seconds: number) {
  return light.start + (reducedMotion ? HELD_SECONDS : seconds);
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
  return lightAt(
    ring,
    box,
    time,
    reducedMotion,
    RING_SECONDS,
    ({ progress, length, x, y, origin }) => {
      const strength = cometStrength(progress);
      const course = cometCourse(progress);
      // The light splits into two comets that meet at the point of the outline farthest from where
      // the light started, each running its own way there at its own pace.
      const far = farthestOutlineParam(box, x, y) / length;
      const clockwise = (((far - origin) % 1) + 1) % 1;
      return [
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
      ];
    },
  );
}

/**
 * When a ring light is over, in seconds on the effect layer's clock: under
 * reduced motion, the moment the still glow goes.
 *
 * @internal
 */
export function ringLightEnd(ring: RingLight, reducedMotion: boolean) {
  return lightEnd(ring, reducedMotion, RING_SECONDS);
}

/**
 * A lap of the ring light: one comet that runs once all the way round the
 * outline, from the point nearest to where it starts back to that point,
 * fast at first, then slowing to a stop as it fades. Its tail grows from
 * nothing as it sets off. `direction` is 1 for clockwise.
 *
 * @internal
 */
export interface RingLap extends RingLight {
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
  return lightAt(
    lap,
    box,
    time,
    reducedMotion,
    LAP_SECONDS,
    ({ progress, origin }) => {
      const course = cometCourse(progress);
      return [
        {
          head: origin + lap.direction * course,
          direction: lap.direction,
          strength: cometStrength(progress),
          tail: Math.min(LAP_TAIL_SHARE, course),
        },
      ];
    },
  );
}

/**
 * When a lap is over, in seconds on the effect layer's clock: under reduced
 * motion, the moment the still glow goes.
 *
 * @internal
 */
export function ringLapEnd(lap: RingLap, reducedMotion: boolean) {
  return lightEnd(lap, reducedMotion, LAP_SECONDS);
}
