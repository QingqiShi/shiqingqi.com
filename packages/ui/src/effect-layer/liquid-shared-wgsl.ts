import { MAX_PARTICLE_COUNT, type LiquidParticles } from "./step-liquid.ts";

/**
 * The byte size of one `LiquidSlot`: its walls and the particles' extent,
 * then room for the most particles a body has.
 *
 * @internal
 */
export const LIQUID_SLOT_BYTES = 16 * (MAX_PARTICLE_COUNT + 1);

/** @internal */
export const LIQUID_SLOT_WORDS = LIQUID_SLOT_BYTES / 4;
const WALL_WORDS = 4;

/**
 * What the liquid's simulation and its drawing share: a slot of the
 * simulation buffer, which holds one body's particles in track space, the
 * walls that held them at the last step, and how far along the track they
 * reach. The simulation keeps each body's slot across frames, and the
 * drawing reads the particles from it.
 *
 * @internal
 */
export const LIQUID_SHARED_WGSL = /* wgsl */ `
const LIQUID_MAX_PARTICLES = ${String(MAX_PARTICLE_COUNT)}u;

struct LiquidSlot {
  // The walls that held the liquid at the last step: from, to. Then the
  // extent of the particles along the track: the least x and the greatest.
  walls: vec4f,
  // Each particle's position, then its velocity, in rest radii and rest
  // radii per second.
  particles: array<vec4f, LIQUID_MAX_PARTICLES>,
}
`;

/**
 * Packs the particles, the walls and the particles' extent as one
 * `LiquidSlot` at `offset` words into `floats`.
 *
 * @internal
 */
export function packLiquidSlot(
  { x, y, vx, vy, from, to }: LiquidParticles,
  floats: Float32Array,
  offset = 0,
) {
  floats.fill(0, offset, offset + LIQUID_SLOT_WORDS);
  floats[offset] = from;
  floats[offset + 1] = to;
  floats[offset + 2] = Math.min(...x);
  floats[offset + 3] = Math.max(...x);
  for (let i = 0; i < x.length; i++) {
    const at = offset + WALL_WORDS + i * 4;
    floats[at] = x[i];
    floats[at + 1] = y[i];
    floats[at + 2] = vx[i];
    floats[at + 3] = vy[i];
  }
}

/**
 * Reads the first `count` particles and the walls of the `LiquidSlot` at
 * `offset` words into `floats`, into arrays of their own.
 *
 * @internal
 */
export function readLiquidSlot(
  floats: Float32Array,
  offset: number,
  count: number,
): LiquidParticles {
  const x = new Float32Array(count);
  const y = new Float32Array(count);
  const vx = new Float32Array(count);
  const vy = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const at = offset + WALL_WORDS + i * 4;
    x[i] = floats[at];
    y[i] = floats[at + 1];
    vx[i] = floats[at + 2];
    vy[i] = floats[at + 3];
  }
  return { x, y, vx, vy, from: floats[offset], to: floats[offset + 1] };
}
