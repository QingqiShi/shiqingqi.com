/**
 * Per second: how fast the on fill rises through the track, or sinks away,
 * as a critically damped spring, so it starts soft and ends with no
 * overshoot. At 18 it is most of the way there in a quarter second.
 */
const RISE_RATE = 18;
/** The rise is done once it is this close to its goal and this slow. */
const RISE_DONE = { gap: 0.003, speed: 0.05 } as const;

/**
 * How far the on fill has risen through a Switch's track, from 0 off to 1
 * on, and how fast it moves, per second.
 *
 * @internal
 */
export interface Rise {
  readonly level: number;
  readonly speed: number;
}

/**
 * Moves the rise on by `delta` seconds towards `goal`: as a spring that
 * starts soft and settles, or straight to it under reduced motion, where no
 * frame follows on its own.
 *
 * @internal
 */
export function stepRise(
  rise: Rise,
  goal: number,
  delta: number,
  reducedMotion: boolean,
): Rise {
  if (reducedMotion) {
    return { level: goal, speed: 0 };
  }
  const gap = rise.level - goal;
  const decay = Math.exp(-RISE_RATE * delta);
  const push = (rise.speed + RISE_RATE * gap) * delta;
  const nextGap = (gap + push) * decay;
  const speed = (rise.speed - RISE_RATE * push) * decay;
  if (Math.abs(nextGap) < RISE_DONE.gap && Math.abs(speed) < RISE_DONE.speed) {
    return { level: goal, speed: 0 };
  }
  return { level: Math.min(1, Math.max(0, goal + nextGap)), speed };
}
