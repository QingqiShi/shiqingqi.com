import { springPath } from "../motion/spring-path.ts";
import { springOf, springRoles } from "../motion/spring-roles.ts";

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

const AIM_SPRING = springOf(springRoles.aim);
const SETTLED_ANGLE = 0.0005;

/**
 * Turns an aim towards `target` for `seconds`, and says whether it has come
 * to rest there.
 *
 * @internal
 */
export function stepAim(aim: Aim, target: number, seconds: number) {
  const path = springPath(
    AIM_SPRING,
    { value: angleBetween(target, aim.angle), velocity: aim.velocity },
    0,
    SETTLED_ANGLE,
  );
  if (seconds >= path.settleTime) {
    return { angle: target, velocity: 0, settled: true };
  }
  const { value, velocity } = path.at(seconds);
  return { angle: target + value, velocity, settled: false };
}
