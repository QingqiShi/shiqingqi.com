/** @internal */
export interface Spring {
  readonly value: number;
  readonly speed: number;
}

/** @internal */
export const still = (value: number): Spring => ({ value, speed: 0 });

/**
 * The push of a damped spring at `value`, moving at `speed`, towards
 * `goal`: `omega` is its natural frequency in radians per second and `zeta`
 * its damping ratio.
 *
 * @internal
 */
export function springPush(
  value: number,
  speed: number,
  goal: number,
  omega: number,
  zeta: number,
) {
  return -omega * omega * (value - goal) - 2 * zeta * omega * speed;
}

/**
 * A damped spring after `delta` seconds, in `rate` steps a second.
 *
 * @internal
 */
export function stepSpring(
  spring: Spring,
  goal: number,
  delta: number,
  omega: number,
  zeta: number,
  rate = 480,
): Spring {
  let { value, speed } = spring;
  const count = Math.max(1, Math.ceil(delta * rate));
  const h = delta / count;
  for (let i = 0; i < count; i++) {
    speed += springPush(value, speed, goal, omega, zeta) * h;
    value += speed * h;
  }
  return { value, speed };
}
