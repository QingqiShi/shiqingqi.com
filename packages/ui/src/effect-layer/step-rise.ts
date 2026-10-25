import { unit } from "../motion/mix.ts";
import { springPath } from "../motion/spring-path.ts";
import { springOf, springRoles } from "../motion/spring-roles.ts";

const FILL_SPRING = springOf(springRoles.switchFill);
/** The rise is done once its energy is this close to its goal. */
const RISE_DONE = 0.003;

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
 * Moves the rise on by `delta` seconds towards `goal`: on the system
 * spring, or straight to it under reduced motion, where no
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
  const path = springPath(
    FILL_SPRING,
    { value: rise.level, velocity: rise.speed },
    goal,
    RISE_DONE,
  );
  if (delta >= path.settleTime) return { level: goal, speed: 0 };
  const { value, velocity } = path.at(delta);
  return { level: unit(value), speed: velocity };
}
