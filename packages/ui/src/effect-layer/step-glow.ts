/**
 * How bright a Lamp is, from 0 off to 1 lit, and how fast it changes, per
 * second.
 *
 * @internal
 */
export interface Glow {
  readonly value: number;
  readonly velocity: number;
}

/**
 * Ignition: the damping ratio of `easing.spring`, so the light swells past
 * full and settles, the way the rest of the system's motion does.
 */
const IGNITION_DAMPING = 0.7;
const IGNITION_FREQUENCY = 2 * Math.PI * 2.2;
/** Going out: critically damped, so the light dies away with no surge. */
const EXTINCTION_DAMPING = 1;
const EXTINCTION_FREQUENCY = 2 * Math.PI * 2.8;
const SPRING_STEP = 1 / 240;
const SETTLED_VALUE = 0.002;
const SETTLED_VELOCITY = 0.02;

/**
 * Moves a glow towards `target` for `seconds`: on a spring that swells past
 * full when the lamp turns on, and on a dying decay when it turns off. Says
 * whether it has come to rest there.
 *
 * @internal
 */
export function stepGlow(glow: Glow, target: number, seconds: number) {
  const igniting = target > glow.value;
  const damping = igniting ? IGNITION_DAMPING : EXTINCTION_DAMPING;
  const frequency = igniting ? IGNITION_FREQUENCY : EXTINCTION_FREQUENCY;
  let offset = glow.value - target;
  let { velocity } = glow;
  const steps = Math.ceil(seconds / SPRING_STEP);
  const step = steps > 0 ? seconds / steps : 0;
  for (let index = 0; index < steps; index++) {
    velocity +=
      (-frequency * frequency * offset - 2 * damping * frequency * velocity) *
      step;
    offset += velocity * step;
  }
  const settled =
    Math.abs(offset) < SETTLED_VALUE && Math.abs(velocity) < SETTLED_VELOCITY;
  return settled
    ? { value: target, velocity: 0, settled }
    : { value: Math.max(0, target + offset), velocity, settled };
}

/**
 * Moves a glow straight towards `target` at `rate` per second, for a
 * crossfade with no swell. Says whether it has got there.
 *
 * @internal
 */
export function fadeGlow(
  glow: Glow,
  target: number,
  seconds: number,
  rate: number,
) {
  const distance = target - glow.value;
  const travel = rate * seconds;
  if (Math.abs(distance) <= travel) {
    return { value: target, velocity: 0, settled: true };
  }
  return {
    value: glow.value + Math.sign(distance) * travel,
    velocity: 0,
    settled: false,
  };
}
