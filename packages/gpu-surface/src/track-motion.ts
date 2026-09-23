import {
  DIRECTION_MIN_SPEED,
  MOTION_DECAY,
  MOTION_MIN_DT_MS,
  MOTION_STALE_MS,
} from "./constants.ts";

export interface Motion {
  /** The last scroll position read, in CSS px. */
  y: number;
  /** When `y` was read, in ms. */
  at: number;
  /** Scroll speed in CSS px per second, smoothed. */
  speed: number;
  /** The last clear scroll direction: 1 down, -1 up, 0 unknown. */
  dir: -1 | 0 | 1;
}

/**
 * How fast and which way the page scrolls, from the scroll positions the main
 * thread sees. Pass `null` for the first reading.
 */
export function trackMotion(
  previous: Motion | null,
  scrollY: number,
  now: number,
): Motion {
  if (previous === null) return { y: scrollY, at: now, speed: 0, dir: 0 };
  const dt = now - previous.at;
  if (dt < MOTION_MIN_DT_MS) return previous;
  if (dt > MOTION_STALE_MS) return { y: scrollY, at: now, speed: 0, dir: 0 };
  const velocity = ((scrollY - previous.y) / dt) * 1000;
  const speed = Math.abs(velocity);
  return {
    y: scrollY,
    at: now,
    speed:
      speed > previous.speed
        ? speed
        : previous.speed * MOTION_DECAY + speed * (1 - MOTION_DECAY),
    dir: speed > DIRECTION_MIN_SPEED ? (velocity > 0 ? 1 : -1) : previous.dir,
  };
}
