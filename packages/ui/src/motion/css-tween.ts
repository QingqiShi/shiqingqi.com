import { cssEasing } from "./css-easing.ts";
import type { Tween } from "./spring-roles.ts";

/**
 * Seconds from a CSS time in ms, such as a `duration` token.
 *
 * @internal
 */
export function cssSeconds(time: string) {
  return Number.parseFloat(time) / 1000;
}

/**
 * A tween from a `duration` token and an `easing` token. It is linear when
 * `easing` is left out.
 *
 * @internal
 */
export function cssTween(time: string, easing?: string): Tween {
  const duration = cssSeconds(time);
  return easing === undefined
    ? { duration }
    : { duration, easing: cssEasing(easing) };
}
