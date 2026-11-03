/**
 * The light on the lit edge of a liquid's solid surface.
 *
 * @internal
 */
export interface EdgeLight {
  /** How much of the light shows, from 0 to 1. */
  readonly amount: number;
  /**
   * Where the light is across the page: -1 over the left of the surface, 0
   * over its middle and 1 over its right.
   */
  readonly lean: number;
}

/** @internal */
export const NO_EDGE_LIGHT: EdgeLight = { amount: 0, lean: 0 };

/** Seconds of the time constants of the light as it comes in, goes and leans. */
const COME_IN_SECONDS = 0.1;
const GO_SECONDS = 0.2;
const LEAN_SECONDS = 0.08;
/** This near its goal, a value is at its goal. */
const NEAR = 0.002;

function approach(value: number, goal: number, seconds: number, tau: number) {
  const next = goal + (value - goal) * Math.exp(-seconds / tau);
  return Math.abs(next - goal) < NEAR ? goal : next;
}

/**
 * The light after `delta` seconds, with `pointer` the lean the pointer asks
 * for, or `null` when no pointer asks for light. The light comes in where the
 * pointer is and then follows it, and it stays where it is as it goes. Under
 * reduced motion it comes and goes at once, and does not follow the pointer.
 *
 * @internal
 */
export function stepEdgeLight(
  light: EdgeLight,
  pointer: number | null,
  delta: number,
  reducedMotion: boolean,
) {
  const goal = pointer === null ? 0 : 1;
  if (reducedMotion) {
    return { light: { amount: goal, lean: 0 }, settled: true };
  }
  const amount = approach(
    light.amount,
    goal,
    delta,
    pointer === null ? GO_SECONDS : COME_IN_SECONDS,
  );
  let { lean } = light;
  if (pointer !== null) {
    lean =
      light.amount === 0
        ? pointer
        : approach(light.lean, pointer, delta, LEAN_SECONDS);
  }
  return {
    light: { amount, lean },
    settled: amount === goal && (pointer === null || lean === pointer),
  };
}
