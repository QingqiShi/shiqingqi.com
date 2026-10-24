import type { Spring, Tween } from "./spring-roles.ts";

/** @internal */
export interface MotionState {
  readonly value: number;
  /** Units a second. */
  readonly velocity: number;
}

/**
 * Where a value is, and how fast it moves, at each time from the start of a
 * motion.
 *
 * @internal
 */
export interface MotionPath {
  at(seconds: number): MotionState;
  /** Seconds from the start until the value is at rest at `target`. */
  readonly settleTime: number;
  readonly target: number;
}

/** @internal */
export function restingPath(value: number): MotionPath {
  const state = { value, velocity: 0 };
  return { at: () => state, settleTime: 0, target: value };
}

/** Damping ratios this close to 1 take the critically damped solution. */
const CRITICAL_BAND = 1e-4;

/** The displacement from the target, and the velocity, of a free spring. */
function freeMotion(
  omega: number,
  zeta: number,
  x0: number,
  v0: number,
): (t: number) => { x: number; v: number } {
  if (Math.abs(zeta - 1) < CRITICAL_BAND) {
    const b = v0 + omega * x0;
    return (t) => {
      const decay = Math.exp(-omega * t);
      return { x: decay * (x0 + b * t), v: decay * (v0 - omega * b * t) };
    };
  }
  if (zeta < 1) {
    const omegaD = omega * Math.sqrt(1 - zeta * zeta);
    const sine = (v0 + zeta * omega * x0) / omegaD;
    const sineV = (omega * omega * x0 + zeta * omega * v0) / omegaD;
    return (t) => {
      const decay = Math.exp(-zeta * omega * t);
      const cos = Math.cos(omegaD * t);
      const sin = Math.sin(omegaD * t);
      return {
        x: decay * (x0 * cos + sine * sin),
        v: decay * (v0 * cos - sineV * sin),
      };
    };
  }
  const root = Math.sqrt(zeta * zeta - 1);
  const fast = -omega * (zeta + root);
  const slow = -omega * (zeta - root);
  const slowShare = (v0 - fast * x0) / (slow - fast);
  const fastShare = x0 - slowShare;
  return (t) => {
    const slowTerm = slowShare * Math.exp(slow * t);
    const fastTerm = fastShare * Math.exp(fast * t);
    return { x: slowTerm + fastTerm, v: slow * slowTerm + fast * fastTerm };
  };
}

/**
 * The first time at which `√(x² + (v/ω)²)`, which is the spring's energy in
 * units of distance, is at most `precision`. The energy only falls, so from
 * then on the value stays within `precision` of the target.
 */
function settleTimeOf(
  motion: (t: number) => { x: number; v: number },
  omega: number,
  precision: number,
) {
  const reach = (t: number) => {
    const { x, v } = motion(t);
    return Math.hypot(x, v / omega);
  };
  if (reach(0) <= precision) return 0;
  let low = 0;
  let high = 1 / omega;
  while (reach(high) > precision) {
    low = high;
    high *= 2;
  }
  while (high - low > 1e-5) {
    const middle = (low + high) / 2;
    if (reach(middle) > precision) low = middle;
    else high = middle;
  }
  return high;
}

/**
 * The exact path of `spring` from `from` to `target`. It is at rest once its
 * energy puts it no further than `precision` from the target, in the units
 * of the value, such as 0.5 for a value in px.
 *
 * @internal
 */
export function springPath(
  spring: Spring,
  from: MotionState,
  target: number,
  precision: number,
): MotionPath {
  if (!(spring.dampingRatio > 0) || !(spring.response > 0)) {
    throw new RangeError(
      "A spring needs a response and a damping ratio above 0.",
    );
  }
  const omega = (2 * Math.PI) / spring.response;
  const motion = freeMotion(
    omega,
    spring.dampingRatio,
    from.value - target,
    from.velocity,
  );
  const settleTime = settleTimeOf(motion, omega, precision);
  const rest = { value: target, velocity: 0 };
  return {
    settleTime,
    target,
    at(seconds) {
      if (seconds >= settleTime) return rest;
      if (seconds <= 0) return from;
      const { x, v } = motion(seconds);
      return { value: target + x, velocity: v };
    },
  };
}

/** The share of the time, as a step for the slope of an easing. */
const SLOPE_STEP = 1e-3;

/** @internal */
export function tweenPath(
  { duration, easing = (t) => t }: Tween,
  from: number,
  target: number,
): MotionPath {
  if (!(duration > 0)) return restingPath(target);
  const distance = target - from;
  const rest = { value: target, velocity: 0 };
  return {
    settleTime: duration,
    target,
    at(seconds) {
      if (seconds >= duration) return rest;
      const share = Math.max(0, seconds / duration);
      const before = Math.max(0, share - SLOPE_STEP);
      const after = Math.min(1, share + SLOPE_STEP);
      const slope = (easing(after) - easing(before)) / (after - before);
      return {
        value: from + distance * easing(share),
        velocity: (distance * slope) / duration,
      };
    },
  };
}

/**
 * `path` from `offset` seconds into it.
 *
 * @internal
 */
export function shiftedPath(path: MotionPath, offset: number): MotionPath {
  return {
    settleTime: Math.max(0, path.settleTime - offset),
    target: path.target,
    at: (seconds) => path.at(seconds + offset),
  };
}

/**
 * `first` for `delay` seconds, and then `next`, which must start where
 * `first` is at `delay`.
 *
 * @internal
 */
export function afterDelay(
  first: MotionPath,
  delay: number,
  next: MotionPath,
): MotionPath {
  return {
    settleTime: delay + next.settleTime,
    target: next.target,
    at: (seconds) =>
      seconds < delay ? first.at(seconds) : next.at(seconds - delay),
  };
}
