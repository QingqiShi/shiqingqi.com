import { smoothstep } from "../motion/mix.ts";

/**
 * The surface of a pond after a stone falls in: one height field, from
 * which the bend of what lies under the water and the light on the water
 * both follow. Lengths are CSS px, times are seconds.
 *
 * @internal
 */
export const POND = {
  speed: 580,
  wavelength: 150,
  amplitude: 6.5,
  /**
   * How deep the content lies under the surface. A tilted surface bends
   * what lies under it by `depth * (1 - 1 / index)` times its slope.
   */
  depth: 150,
  index: 1.33,
  /** The distance over which a ring spreads its height. */
  spread: 120,
  /** The time over which the water damps the rings. */
  damping: 0.8,
  /** The width of the shore: the rings fade out over it at the edge. */
  shore: 14,
  /** The longest that the pond takes to calm. */
  longest: 0.66,
  /** The time over which the last of the rings fades, when the pond is large. */
  lastFade: 0.15,
  /**
   * The most stones whose rings run at one time. A further stone makes the
   * oldest calm over `lastFade`.
   */
  stones: 4,
} as const;

/**
 * The most stones that a pond holds: `POND.stones`, and one that calms.
 *
 * @internal
 */
export const STONE_SLOTS = POND.stones + 1;

/** How long the train of rings is: past this, its crests are gone. */
const TRAIN = POND.wavelength * 2.5;

/** @internal */
export const POND_BEND = POND.depth * (1 - 1 / POND.index);

/** @internal */
export const PROFILE_STEP = 0.5;

/**
 * The most entries a profile has: enough for the rings to cross the pond.
 *
 * @internal
 */
export const PROFILE_LENGTH =
  Math.ceil((POND.speed * POND.longest) / PROFILE_STEP) + 2;

/**
 * The height of the water at `distance` from where the stone landed, `time`
 * seconds later. The train of rings starts with its highest crest just
 * behind the front, and dies out behind it. The water stays calm at the
 * touch point itself.
 */
function heightAt(distance: number, time: number) {
  const behind = POND.speed * time - distance;
  if (behind <= 0 || behind >= TRAIN) return 0;
  const envelope =
    smoothstep(0, POND.wavelength / 2, behind) *
    Math.exp(-behind / POND.wavelength) *
    smoothstep(TRAIN, TRAIN - POND.wavelength, behind);
  const spread = 1 / Math.sqrt(1 + distance / POND.spread);
  const damping = Math.exp(-time / POND.damping);
  const centre = smoothstep(0, POND.wavelength / 2, distance);
  return (
    POND.amplitude *
    envelope *
    spread *
    damping *
    centre *
    Math.sin((2 * Math.PI * behind) / POND.wavelength)
  );
}

/**
 * When the last ring of a stone that landed at (`x`, `y`) in a pond of
 * `width` by `height` has left it.
 *
 * @internal
 */
export function pondEnd(x: number, y: number, width: number, height: number) {
  const farthest = Math.hypot(Math.max(x, width - x), Math.max(y, height - y));
  return Math.min(POND.longest, (farthest + TRAIN) / POND.speed);
}

/**
 * The distance from the touch point inside which the water is calm again at
 * `time`, because the train of rings has passed.
 *
 * @internal
 */
export function calmWithin(time: number) {
  return Math.max(0, POND.speed * time - TRAIN);
}

/**
 * The slope of the water at `time`, outward from the touch point, at each
 * `PROFILE_STEP` of distance from it, as far as the front: the radial
 * derivative of the height. Near the end of the pond, at `end`, the rings
 * fade out. The bend of the content and the light on the water both read
 * this profile, so they show one surface.
 *
 * @internal
 */
export function slopeProfile(time: number, end: number) {
  const fade = smoothstep(end, end - POND.lastFade, time);
  const count = Math.min(
    PROFILE_LENGTH,
    Math.ceil((POND.speed * time) / PROFILE_STEP) + 2,
  );
  const half = PROFILE_STEP / 2;
  // Entry `at` takes the difference of the heights half a step to each side.
  // The first entry cannot look behind the touch point, so it looks only
  // half a step ahead of it.
  let behind = heightAt(0, time);
  const profile = new Float32Array(count);
  for (let at = 0; at < count; at++) {
    const ahead = heightAt(at * PROFILE_STEP + half, time);
    profile[at] = (fade * (ahead - behind)) / (at === 0 ? half : PROFILE_STEP);
    behind = ahead;
  }
  return profile;
}

/**
 * The slope in `profile` at `distance`, between its entries.
 *
 * @internal
 */
export function slopeAt(profile: Float32Array, distance: number) {
  const place = distance / PROFILE_STEP;
  const below = Math.floor(place);
  if (below + 1 >= profile.length) return 0;
  const share = place - below;
  return (
    (profile[below] ?? 0) * (1 - share) + (profile[below + 1] ?? 0) * share
  );
}
