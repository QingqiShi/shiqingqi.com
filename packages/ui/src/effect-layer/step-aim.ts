/**
 * Radians clockwise from pointing right, for a CSS angle: 0deg points up and
 * 90deg points right, as in `linear-gradient`.
 *
 * @internal
 */
export function cssAngleToRadians(degrees: number) {
  return ((degrees - 90) * Math.PI) / 180;
}

/**
 * The difference `to - from` in radians, the short way round: in (-π, π].
 *
 * @internal
 */
export function angleBetween(from: number, to: number) {
  const turn = 2 * Math.PI;
  const difference = (((to - from) % turn) + turn) % turn;
  return difference > Math.PI ? difference - turn : difference;
}

/**
 * The aim of a beam that turns on a spring: its angle in radians and how fast
 * it turns, in radians per second.
 *
 * @internal
 */
export interface Aim {
  readonly angle: number;
  readonly velocity: number;
}

// The damping ratio of `easing.spring`, so that the beam overshoots by about
// as much as the rest of the system's motion.
const SPRING_DAMPING = 0.7;
const SPRING_FREQUENCY = 2 * Math.PI * 1.3;
const SPRING_STEP = 1 / 240;
const SETTLED_ANGLE = 0.0005;
const SETTLED_VELOCITY = 0.005;

/**
 * Turns an aim towards `target` for `seconds`, and says whether it has come
 * to rest there.
 *
 * @internal
 */
export function stepAim(aim: Aim, target: number, seconds: number) {
  let offset = angleBetween(target, aim.angle);
  let { velocity } = aim;
  const steps = Math.ceil(seconds / SPRING_STEP);
  const step = steps > 0 ? seconds / steps : 0;
  for (let index = 0; index < steps; index++) {
    velocity +=
      (-SPRING_FREQUENCY * SPRING_FREQUENCY * offset -
        2 * SPRING_DAMPING * SPRING_FREQUENCY * velocity) *
      step;
    offset += velocity * step;
  }
  const settled =
    Math.abs(offset) < SETTLED_ANGLE && Math.abs(velocity) < SETTLED_VELOCITY;
  return settled
    ? { angle: target, velocity: 0, settled }
    : { angle: target + offset, velocity, settled };
}
