import type { Rgb } from "./beam-color.ts";
import type { PageRect } from "./lens-from-box.ts";

/**
 * A Light beam: a ray of light behind every lens, which is seen to leave the
 * centre of its element. Lengths are CSS px and positions are page
 * coordinates.
 *
 * @internal
 */
export interface Beam {
  /** Where the light seen at the element's centre comes from. */
  readonly x: number;
  readonly y: number;
  /** Radians clockwise from pointing right, as the page's y axis points down. */
  readonly angle: number;
  /** How far from the centre the beam leaves its element. */
  readonly start: number;
  /** How far from the centre the beam has faded out. */
  readonly reach: number;
  readonly color: Rgb;
}

/**
 * Half the width of the beam's soft edge where it leaves its element, and how
 * much it widens per CSS px it travels. The shader uses the same values.
 *
 * @internal
 */
export const BEAM_WIDTH = 9;
/** @internal */
export const BEAM_DIVERGENCE = 0.018;
/**
 * How many widths of the dust glow from its line a beam's light reaches
 * before it is too faint for 8 bits. The dust glow is the widest part.
 *
 * @internal
 */
export const BEAM_CUTOFF = 2.5;
/**
 * How much wider than the soft edge the dust a beam lights reaches.
 *
 * @internal
 */
export const BEAM_DUST_REACH = 1.8;

/**
 * Whether light from a beam can show in a rectangle that every lens together
 * bends by at most `bend`: the beam, out to its reach and widened by its soft
 * edge, meets the rectangle grown by `bend`.
 *
 * @internal
 */
export function beamMeetsRect(beam: Beam, rect: PageRect, bend: number) {
  const margin =
    bend +
    (BEAM_WIDTH + beam.reach * BEAM_DIVERGENCE) * BEAM_DUST_REACH * BEAM_CUTOFF;
  const left = rect.x - margin;
  const top = rect.y - margin;
  const right = rect.x + rect.width + margin;
  const bottom = rect.y + rect.height + margin;
  const directionX = Math.cos(beam.angle) * beam.reach;
  const directionY = Math.sin(beam.angle) * beam.reach;
  let enter = 0;
  let leave = 1;
  for (const [origin, delta, low, high] of [
    [beam.x, directionX, left, right],
    [beam.y, directionY, top, bottom],
  ] as const) {
    if (Math.abs(delta) < 1e-9) {
      if (origin < low || origin > high) {
        return false;
      }
      continue;
    }
    const first = (low - origin) / delta;
    const second = (high - origin) / delta;
    enter = Math.max(enter, Math.min(first, second));
    leave = Math.min(leave, Math.max(first, second));
  }
  return enter <= leave;
}

/**
 * The distance from the centre of a box to its edge, along a direction.
 *
 * @internal
 */
export function distanceToEdge(
  halfWidth: number,
  halfHeight: number,
  angle: number,
) {
  const x = Math.abs(Math.cos(angle));
  const y = Math.abs(Math.sin(angle));
  return Math.min(
    x > 1e-9 ? halfWidth / x : Number.POSITIVE_INFINITY,
    y > 1e-9 ? halfHeight / y : Number.POSITIVE_INFINITY,
  );
}
