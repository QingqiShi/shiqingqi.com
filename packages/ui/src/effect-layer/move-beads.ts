import {
  PARTICLE_RADIUS,
  PARTICLE_SPACING,
  type LiquidBead,
  type LiquidBody,
} from "./resting-liquid.ts";
import {
  insideTrack,
  leanTo,
  TILT,
  type LiquidInput,
  type Walls,
} from "./simulate-liquid.ts";

const SHED_CHANCE = 0.9;
const BEAD_RADIUS = { min: 0.22, max: 0.38 } as const;
const BEAD_LIFE = { min: 1.6, max: 3 } as const;
const MAX_BEADS = 16;
/** Seconds a bead takes to swell out of the trailing edge. */
const BEAD_GROW = 0.04;
/** A bead leaves with this share of the body's speed. */
const BEAD_CARRY = 0.12;
/**
 * The track holds a bead back by this much, in rest radii per second
 * squared, against the tilt's `TILT`: much more than it holds the body, so
 * that a bead falls behind the body but keeps moving on.
 */
const BEAD_FRICTION = 40;
/**
 * How far the liquid's surface reaches for a bead, as a multiple of the
 * bead's radius: the body and the bead join with a neck while the gap
 * between them is less than half of it.
 *
 * @internal
 */
export const NECK_REACH = 1.6;
/** Per second: how fast the body absorbs a bead whose centre it covers. */
const ABSORB = 20;
/** A bead this small has gone, in rest radii. */
const GONE_RADIUS = 0.02;

function between(unit: number, range: { min: number; max: number }) {
  return range.min + (range.max - range.min) * unit;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/**
 * A bead's drawn radius, in rest radii: it swells out of the body and
 * shrinks as it evaporates.
 *
 * @internal
 */
export function beadRadius(bead: LiquidBead) {
  const grown = clamp01(bead.age / BEAD_GROW);
  const swell = grown * grown * (3 - 2 * grown);
  return bead.radius * swell * Math.sqrt(Math.max(0, 1 - bead.age / bead.life));
}

/** How far the nearest particle is from `(x, y)`. */
function nearestParticle(
  body: { x: Float32Array; y: Float32Array },
  x: number,
  y: number,
) {
  let nearest = Number.POSITIVE_INFINITY;
  for (let i = 0; i < body.x.length; i++) {
    nearest = Math.min(nearest, Math.hypot(body.x[i] - x, body.y[i] - y));
  }
  return nearest;
}

/**
 * Moves and ages the beads: the tilt towards `target` moves them on, and
 * the track holds them back. A bead pinches off once the body has drawn
 * away from it, and the body absorbs a bead that has pinched off once it
 * covers its centre: the bead shrinks into it. As the body settles, it
 * absorbs each bead once the bead is all in the rest shape at `target`.
 * Drops the beads that have evaporated or been absorbed.
 *
 * @internal
 */
export function moveBeads(
  beads: readonly LiquidBead[],
  body: { x: Float32Array; y: Float32Array },
  delta: number,
  { target, span }: LiquidInput,
  walls: Walls,
  scale: number,
  boost: number,
  settling: boolean,
) {
  const kept: LiquidBead[] = [];
  for (const bead of beads) {
    const age = bead.age + delta;
    if (age >= bead.life) {
      continue;
    }
    const tilt = TILT * boost * leanTo(target - bead.x) * delta;
    const held = Math.min(
      BEAD_FRICTION * boost * delta,
      Math.abs(bead.vx + tilt),
    );
    const vx = bead.vx + tilt - Math.sign(bead.vx + tilt) * held;
    const drawn = beadRadius({ ...bead, age });
    const { x, y } = insideTrack(bead.x + vx * delta, bead.y, drawn, walls);
    const nearest = nearestParticle(body, x, y);
    const gap = nearest - PARTICLE_RADIUS * scale - drawn;
    const free =
      bead.free || (age > BEAD_GROW && gap > (NECK_REACH * drawn) / 2);
    const restX = clamp(x, target - span, target + span);
    const absorbed = settling
      ? Math.hypot(x - restX, y) + drawn < 1
      : free && nearest < PARTICLE_SPACING * scale;
    const radius = absorbed
      ? bead.radius * Math.exp(-ABSORB * delta)
      : bead.radius;
    if (radius > GONE_RADIUS) {
      kept.push({ x, y, vx, radius, age, life: bead.life, free });
    }
  }
  return kept;
}

/** @internal */
export type Shedding = Pick<LiquidBody, "beads" | "shedAt" | "seed">;

/**
 * Sheds a bead from the trailing edge when the body has `moved` far enough
 * since the last one. The bead starts at a particle on the trailing edge,
 * inside the body, and swells out of it.
 *
 * @internal
 */
export function shed(
  last: Shedding,
  x: Float32Array,
  y: Float32Array,
  moved: number,
  step: number,
  spacing: number,
): Shedding {
  const trailing = moved > 0 ? Math.min(...x) : Math.max(...x);
  if (moved === 0 || Math.abs(trailing - last.shedAt) < spacing) {
    return last;
  }
  let seed = last.seed;
  const draw = () => {
    seed = (Math.imul(seed ^ (seed >>> 15), 0x2c1b3c6d) + 1) >>> 0;
    return ((seed >>> 8) & 0xffffff) / 0x1000000;
  };
  if (draw() > SHED_CHANCE || last.beads.length >= MAX_BEADS) {
    return { beads: last.beads, shedAt: trailing, seed };
  }
  const radius = between(draw(), BEAD_RADIUS);
  const life = between(draw(), BEAD_LIFE);
  const height = (draw() - 0.5) * 0.9;
  const direction = Math.sign(moved);
  let at = -1;
  let ahead = Number.POSITIVE_INFINITY;
  for (let i = 0; i < x.length; i++) {
    if (Math.abs(y[i] - height) < 0.2 && x[i] * direction < ahead) {
      at = i;
      ahead = x[i] * direction;
    }
  }
  const beads =
    at < 0
      ? last.beads
      : [
          ...last.beads,
          {
            x: x[at],
            y: y[at],
            vx: (BEAD_CARRY * moved) / step,
            radius,
            age: 0,
            life,
            free: false,
          },
        ];
  return { beads, shedAt: trailing, seed };
}
