import { LiquidParticle, LiquidSlot } from "../_generated/wgsl/layouts.ts";
import type { LiquidParticles } from "./step-liquid.ts";

const WORD = Float32Array.BYTES_PER_ELEMENT;
const {
  walls: WALLS_AT,
  extent: EXTENT_AT,
  particles: PARTICLES_AT,
} = LiquidSlot.offsets;
const PARTICLE_WORDS = LiquidParticle.stride / WORD;

/**
 * Writes the particles into `floats`, as their `LiquidSlot`: them, the walls
 * and their extent, with zeros in the rest of the slot.
 *
 * @internal
 */
export function writeLiquidSlot(
  floats: Float32Array,
  { x, y, vx, vy, from, to }: LiquidParticles,
) {
  floats.fill(0);
  const walls = WALLS_AT / WORD;
  floats[walls] = from;
  floats[walls + 1] = to;
  let least = Infinity;
  let greatest = -Infinity;
  for (let i = 0; i < x.length; i++) {
    const at = PARTICLES_AT / WORD + i * PARTICLE_WORDS;
    floats[at] = x[i];
    floats[at + 1] = y[i];
    floats[at + 2] = vx[i];
    floats[at + 3] = vy[i];
    least = Math.min(least, x[i]);
    greatest = Math.max(greatest, x[i]);
  }
  const extent = EXTENT_AT / WORD;
  floats[extent] = least;
  floats[extent + 1] = greatest;
}

/**
 * Reads the first `count` particles and the walls of the `LiquidSlot` at
 * `byteOffset` into `floats`, into arrays of their own. The particles come
 * back each frame the liquid moves, so this reads the words in place.
 *
 * @internal
 */
export function readLiquidSlot(
  floats: Float32Array,
  byteOffset: number,
  count: number,
): LiquidParticles {
  const offset = byteOffset / WORD;
  const x = new Float32Array(count);
  const y = new Float32Array(count);
  const vx = new Float32Array(count);
  const vy = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    // A particle's words are its position, then its velocity.
    const at = offset + PARTICLES_AT / WORD + i * PARTICLE_WORDS;
    x[i] = floats[at];
    y[i] = floats[at + 1];
    vx[i] = floats[at + 2];
    vy[i] = floats[at + 3];
  }
  const walls = offset + WALLS_AT / WORD;
  return { x, y, vx, vy, from: floats[walls], to: floats[walls + 1] };
}
