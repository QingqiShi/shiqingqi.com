import { moveBeads, shed, type Shedding } from "./move-beads.ts";
import {
  PARTICLE_RADIUS,
  restingLiquid,
  scaleFor,
  type LiquidBody,
  type LiquidParticles,
} from "./resting-liquid.ts";
import {
  simulateLiquid,
  tiltBoost,
  type LiquidInput,
} from "./simulate-liquid.ts";

/**
 * The longest frame the liquid keeps up with. At 30 Hz, as in iOS Low Power
 * Mode, a frame can take twice its interval, and the liquid must not slow
 * down then.
 */
const MAX_STEP = 1 / 15;
/**
 * The liquid's clock runs this many times faster than the page's: every
 * rate here is per second of the liquid's clock, so the whole pour, its
 * beads and its setting speed up together and the physics stays the same.
 */
const PACE = 1.5;

/** Below this mean speed, in rest radii per second, the liquid is still. */
const STILL_SPEED = 0.3;
/**
 * The liquid has arrived once the centre of its mass is this near the
 * target, in rest radii, plus this share of the span for a pill, which
 * sloshes further: as it lands on the far end.
 */
const ARRIVE_REACH = 0.2;
const ARRIVE_SPAN = 0.5;
/**
 * Seconds on the page's clock that the liquid takes to settle once it has
 * arrived: until then it flows on, sloshes, and takes its drops back in.
 */
const LINGER = 0.8;
/**
 * Seconds on the page's clock, at the end of `LINGER`, in which the
 * liquid sets solid.
 */
const SET_TIME = 1 / 3;
/**
 * Per second: how fast the liquid that has arrived settles into the rest
 * shape, and how fast it sets.
 */
const SETTLE = 1 / (LINGER * PACE);
const SET = 1 / (SET_TIME * PACE);
/**
 * How far the liquid sets while it lingers: its core is solid, and its rim
 * is water.
 *
 * @internal
 */
export const LINGER_SET = 0.4;
const CALM_FALL = 16;
/** Per second: how fast the thumb thaws into water. */
const MELT = 6;

/**
 * The trailing edge sheds at most one bead each time it moves this far, or
 * a `SHED_BUDGET` share of the room between the walls if that is more, so
 * that a long pour leaves beads along its way and not a row of them. The
 * room of a Switch is at most 2.29, so its spacing is always this.
 */
const SHED_SPACING = 0.233;
const SHED_BUDGET = 10.8;
/** The trailing edge sheds only when it moves faster than this. */
const SHED_SPEED = 1;
/**
 * The body sheds nothing within this reach of its target, so that a bead it
 * sheds as it lands does not join the beads behind it to the body.
 */
const SHED_REACH = 0.7;

/** Per second: how fast the body spreads or gathers to fill a new pill. */
const SCALE_RATE = 8;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/**
 * The mean of the values: of a body's `x` or `y`, the centre of the
 * liquid's mass along or across the track.
 *
 * @internal
 */
export function mean(values: ArrayLike<number>) {
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
  }
  return sum / values.length;
}

/**
 * How far a frame of `delta` seconds moves the liquid's clock, in seconds
 * of that clock.
 *
 * @internal
 */
export function liquidStep(delta: number) {
  return Math.min(delta, MAX_STEP) * PACE;
}

/** The particles this near the wall of an end count as where the liquid meets it. */
const IMPACT_BAND = 0.15;

/**
 * Where the liquid lands on the wall at `end`, which the liquid pours
 * towards in `direction` (1 along the track, -1 back), or `null` while it
 * does not touch that wall: the middle of the particles that meet the wall
 * there, pushed out onto the wall. Liquid past the wall, which a wall that
 * has moved in behind it leaves, does not touch it.
 *
 * @internal
 */
export function impactOn(body: LiquidBody, end: number, direction: 1 | -1 = 1) {
  const limit = 1 - PARTICLE_RADIUS * body.scale - 0.03;
  let touches = false;
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < body.x.length; i++) {
    const dx = (body.x[i] - end) * direction;
    if (dx <= 0) {
      continue;
    }
    const distance = Math.hypot(dx, body.y[i]);
    if (distance > limit + IMPACT_BAND) {
      continue;
    }
    touches ||= distance >= limit;
    if (distance >= limit - IMPACT_BAND) {
      sumX += dx;
      sumY += body.y[i];
    }
  }
  if (!touches) {
    return null;
  }
  const length = Math.hypot(sumX, sumY);
  return { x: end + (direction * sumX) / length, y: sumY / length };
}

/**
 * Whether every particle has a finite place and speed: a GPU whose maths
 * overflowed sends NaN back, which no step recovers from.
 *
 * @internal
 */
export function finiteParticles({ x, y, vx, vy }: LiquidParticles) {
  for (const values of [x, y, vx, vy]) {
    for (let i = 0; i < values.length; i++) {
      if (!Number.isFinite(values[i])) {
        return false;
      }
    }
  }
  return true;
}

/**
 * The reach of the particles after a step of `step` seconds on the
 * liquid's clock: it moves from `scale` towards the reach that fills the
 * pill of `span` with `count` particles.
 *
 * @internal
 */
export function scaleAfter(
  scale: number,
  span: number,
  count: number,
  step: number,
) {
  const goal = scaleFor(span, count);
  return goal + (scale - goal) * Math.exp(-SCALE_RATE * step);
}

/**
 * The body after a step of `delta` seconds whose substeps moved its
 * particles to `moved`: it reads where the liquid is and how fast it goes,
 * settles and freezes it once it has arrived, moves its beads and sheds
 * new ones. `elapsed` is how long on the liquid's clock the particles took
 * to go from the body's to `moved`: the step, unless the GPU moved them
 * over more than one frame, or not at all since the body last read them.
 *
 * @internal
 */
export function settleLiquid(
  body: LiquidBody,
  moved: LiquidParticles,
  input: LiquidInput,
  delta: number,
  elapsed = liquidStep(delta),
): LiquidBody {
  const { target, span, pressed } = input;
  const count = body.x.length;
  const step = liquidStep(delta);
  const goal = scaleFor(span, count);
  const scale = scaleAfter(body.scale, span, count, step);
  const { x, y, from, to } = moved;
  const vx = new Float32Array(moved.vx);
  const vy = new Float32Array(moved.vy);
  const walls = { from, to };
  let speedSum = 0;
  for (let i = 0; i < count; i++) {
    speedSum += Math.hypot(vx[i], vy[i]);
  }
  const speed = speedSum / count;
  const centre = mean(x);
  const away = Math.abs(target - centre);
  const boost = tiltBoost(away);
  const arrived = away < ARRIVE_REACH + ARRIVE_SPAN * span;
  const calm = clamp01(body.calm + (arrived ? SETTLE : -CALM_FALL) * step);
  // The liquid sets only as far as `LINGER_SET` while it lingers, so that
  // its rim stays water and flows. It sets all the way at the end.
  const setGoal = calm >= 1 - SET_TIME / LINGER ? 1 : LINGER_SET;
  const set =
    arrived && !pressed
      ? Math.max(body.set, Math.min(setGoal, body.set + SET * step))
      : clamp01(body.set - MELT * step);
  const kept: Shedding = {
    beads: moveBeads(
      body.beads,
      { x, y },
      step,
      input,
      walls,
      scale,
      boost,
      arrived,
    ),
    shedAt: body.shedAt,
    seed: body.seed,
  };
  const { beads, shedAt, seed } =
    speed < SHED_SPEED || away < SHED_REACH || elapsed <= 0
      ? kept
      : shed(
          kept,
          x,
          y,
          centre - mean(body.x),
          elapsed,
          Math.max(SHED_SPACING, (input.to - input.from) / SHED_BUDGET),
        );
  const settled =
    calm >= 1 &&
    speed < STILL_SPEED &&
    set === (pressed ? 0 : 1) &&
    beads.length === 0 &&
    Math.abs(scale - goal) < 1e-3;
  if (settled) {
    vx.fill(0);
    vy.fill(0);
  }
  return {
    x,
    y,
    vx,
    vy,
    calm,
    set,
    settled,
    scale: settled ? goal : scale,
    from,
    to,
    beads,
    shedAt,
    seed,
  };
}

/**
 * The particles of a body as the GPU last had them, and the time on the
 * liquid's clock they are from.
 *
 * @internal
 */
export interface LiquidSnapshot {
  readonly particles: LiquidParticles;
  readonly time: number;
}

/**
 * Settles the body on `snapshot` when it is newer than `particlesAt`, the
 * time on the liquid's clock of the particles the body last read, and on
 * its own particles when it is not. Returns the body and the time of its
 * particles.
 *
 * @internal
 */
export function settleOnSnapshot(
  body: LiquidBody,
  snapshot: LiquidSnapshot | null,
  particlesAt: number,
  input: LiquidInput,
  delta: number,
): { body: LiquidBody; particlesAt: number } {
  if (snapshot === null || snapshot.time <= particlesAt) {
    return { body: settleLiquid(body, body, input, delta, 0), particlesAt };
  }
  return {
    body: settleLiquid(
      body,
      snapshot.particles,
      input,
      delta,
      snapshot.time - particlesAt,
    ),
    particlesAt: snapshot.time,
  };
}

/**
 * The body under reduced motion: the frozen rest shape at the target.
 *
 * @internal
 */
export function frozenLiquid(body: LiquidBody, input: LiquidInput) {
  return restingLiquid(input.target, {
    seed: body.seed,
    span: input.span,
    count: body.x.length,
    from: input.from,
    to: input.to,
  });
}

/**
 * Moves the liquid on by `delta` seconds, all on the CPU, where the effect
 * runs the substeps on the GPU. Under reduced motion it goes straight to
 * the target as the frozen rest shape and sheds nothing.
 *
 * @internal
 */
export function stepLiquid(
  body: LiquidBody,
  input: LiquidInput,
  delta: number,
): LiquidBody {
  if (input.reducedMotion) {
    return frozenLiquid(body, input);
  }
  const step = liquidStep(delta);
  const scale = scaleAfter(body.scale, input.span, body.x.length, step);
  return settleLiquid(
    body,
    simulateLiquid(body, input, scale, step),
    input,
    delta,
  );
}
