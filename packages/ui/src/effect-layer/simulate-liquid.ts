import {
  KERNEL_REACH,
  MAX_PARTICLE_COUNT,
  PARTICLE_RADIUS,
  REST_DENSITY,
  type LiquidParticles,
} from "./resting-liquid.ts";

/**
 * What one step reads from the Switch or the segmented control.
 *
 * @internal
 */
export interface LiquidInput {
  /** Where the liquid is pulled to: the centre of its rest shape. */
  readonly target: number;
  /**
   * Half the length of the straight part of the rest shape: 0 for a
   * thumb's circle, more for an indicator's pill.
   */
  readonly span: number;
  /**
   * The walls the liquid lands on: the centres of the end caps of the room
   * it has. A Switch's are the ends of its track. A segmented control puts
   * the wall ahead of the liquid at the far end of the target's pill, so
   * the liquid lands there. A wall that moves in stops at the liquid and
   * follows it in, so it never pushes the liquid.
   */
  readonly from: number;
  readonly to: number;
  /** A pointer is down on the control, so the liquid stays melted. */
  readonly pressed: boolean;
  readonly reducedMotion: boolean;
  /**
   * Where the press that sent the liquid was across the track, from -1 at
   * its top to 1 at its bottom. While the liquid pours, the track also tilts
   * a little across towards it, so the liquid lands higher or lower on the
   * far end. A toggle with no press point aims at 0, the centre line.
   */
  readonly aim: number;
  /**
   * A drag holds the liquid under the finger. It stays liquid and keeps its
   * shape there, and calms into the rest shape only after the release.
   */
  readonly held?: boolean;
}

const SUBSTEP = 1 / 240;
/**
 * A particle moves at most this far, in rest radii, in one substep: a
 * boosted pour takes more substeps, so that the relaxation stays stable.
 * A Switch's particles never move more than 0.06 in a substep.
 */
const SUBSTEP_MOVE = 0.08;
/**
 * The most substeps one step takes, which bounds a frame's work on the GPU:
 * a frame's step is at most `MAX_STEP`, so this is reached only by a body
 * that moves faster than any pour does. A pour across a wide track moves
 * at most about 75 rest radii per second.
 *
 * @internal
 */
export const MAX_SUBSTEPS = 96;

/** @internal */
export const STIFFNESS = 150;
/** @internal */
export const NEAR_STIFFNESS = 500;
/** @internal */
export const VISCOSITY = 3;
/** @internal */
export const VISCOSITY_QUADRATIC = 0.25;
/**
 * Per second, on every particle: the liquid's loss to the track.
 *
 * @internal
 */
export const DRAG = 2.5;
/**
 * Per second, more loss once the body has come to its target, so that the
 * slosh after it lands dies away over the time it lingers.
 *
 * @internal
 */
export const SETTLE_DRAG = 2.5;
/**
 * The tilt towards the target, in rest radii per second squared.
 *
 * @internal
 */
export const TILT = 56;
/** Within this reach of the target the tilt eases off. */
const TILT_REACH = 0.4;
/**
 * The most the lean's `tanh` is given, in units of `TILT_REACH`. `tanh` is
 * 1 in f32 from 20 on, so this changes no result. Under relaxed math, which
 * is WebKit's default for Metal, a `tanh` that goes through `exp` overflows
 * to inf / inf = NaN from about 44 on, and a wide track reaches that.
 */
const LEAN_LIMIT = 20;
/**
 * Farther from the target than this, the tilt is steeper, by how much
 * farther to the power `TILT_BOOST_POWER` and at most `TILT_BOOST_MAX`
 * times, so that a pour to the next segment lands about when a Switch's
 * does and a pour across several lands not much later: longer than any
 * Switch's travel, which is at most 2.29 rest radii, so a Switch pours as
 * it always has.
 */
const TILT_BOOST_REACH = 2.5;
const TILT_BOOST_POWER = 1.5;
const TILT_BOOST_MAX = 3.25;
/**
 * The tilt across the track at a full `aim`, in rest radii per second
 * squared, while the liquid pours. It moves the body only a little across,
 * but enough that it lands well off the middle of the far end.
 *
 * @internal
 */
export const AIM_TILT = 6;
/**
 * A weak pull to the centre line, so the body sits on it at rest.
 *
 * @internal
 */
export const CENTRE_PULL = 4;
/**
 * The liquid wets the wall it touches: per second, how fast a particle
 * within `WALL_GRIP_REACH` of the wall loses its speed, so that the front
 * pins where it lands and the mass behind it sloshes. A pill wets the
 * track's long sides all along its length, where a thumb touches them
 * only at its poles, so the sides share this grip over `SIDE_GRIP_SHARE`
 * times the pill's span: else they drag the pill out into a long slab
 * with a tail.
 *
 * @internal
 */
export const WALL_GRIP = 12;
/** @internal */
export const WALL_GRIP_REACH = 0.08;
/** @internal */
export const SIDE_GRIP_SHARE = 8;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * How many substeps a step of `step` seconds takes for a body whose
 * fastest particle moves at `fastest` rest radii per second.
 *
 * @internal
 */
export function substepCount(step: number, fastest: number) {
  "use gpu";
  return Math.min(
    MAX_SUBSTEPS,
    Math.max(
      1,
      Math.ceil(step / SUBSTEP),
      Math.ceil((step * fastest) / SUBSTEP_MOVE),
    ),
  );
}

/** @internal */
export interface Walls {
  readonly from: number;
  readonly to: number;
}

/**
 * How far a particle of `radius` at `(x, y)` is from the wall of a track
 * that holds the liquid between `from` and `to`.
 *
 * @internal
 */
export function wallGap(
  x: number,
  y: number,
  radius: number,
  from: number,
  to: number,
) {
  "use gpu";
  const outside = x - Math.min(to, Math.max(from, x));
  return 1 - radius - Math.sqrt(outside * outside + y * y);
}

/**
 * The nearest point to `(x, y)` that a disk of `radius` fits in the track.
 *
 * @internal
 */
export function insideTrack(
  x: number,
  y: number,
  radius: number,
  { from, to }: Walls,
) {
  const nearX = clamp(x, from, to);
  const dx = x - nearX;
  const distance = Math.hypot(dx, y);
  const limit = 1 - radius;
  if (distance <= limit) {
    return { x, y };
  }
  const scale = limit / distance;
  return { x: nearX + dx * scale, y: y * scale };
}

/**
 * The walls for this step: the input's, but a wall that moves in stops
 * where it would push a particle, and moves in only as the liquid leaves.
 */
function wallsFor(body: LiquidParticles, input: Walls, scale: number): Walls {
  const reach = 1 - PARTICLE_RADIUS * scale;
  let leftmost = Number.POSITIVE_INFINITY;
  let rightmost = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < body.x.length; i++) {
    const across = Math.sqrt(Math.max(0, reach * reach - body.y[i] ** 2));
    leftmost = Math.min(leftmost, body.x[i] + across);
    rightmost = Math.max(rightmost, body.x[i] - across);
  }
  return {
    from: input.from <= body.from ? input.from : Math.min(input.from, leftmost),
    to: input.to >= body.to ? input.to : Math.max(input.to, rightmost),
  };
}

const density = new Float32Array(MAX_PARTICLE_COUNT);
const nearDensity = new Float32Array(MAX_PARTICLE_COUNT);
const previousX = new Float32Array(MAX_PARTICLE_COUNT);
const previousY = new Float32Array(MAX_PARTICLE_COUNT);
const pairI = new Int32Array(
  (MAX_PARTICLE_COUNT * (MAX_PARTICLE_COUNT - 1)) / 2,
);
const pairJ = new Int32Array(pairI.length);

/** Lists every pair within `reach`; returns how many. */
function findPairs(x: Float32Array, y: Float32Array, reach: number) {
  let count = 0;
  const reachSquared = reach * reach;
  for (let i = 0; i < x.length; i++) {
    for (let j = i + 1; j < x.length; j++) {
      const dx = x[j] - x[i];
      const dy = y[j] - y[i];
      if (dx * dx + dy * dy < reachSquared) {
        pairI[count] = i;
        pairJ[count] = j;
        count++;
      }
    }
  }
  return count;
}

/**
 * How far the track leans towards a target `away` off: from -1 to 1, flat
 * within `TILT_REACH` of it. The limit keeps `tanh` in the range where the
 * GPU's relaxed maths is finite.
 *
 * @internal
 */
export function leanTo(away: number) {
  "use gpu";
  return Math.tanh(
    Math.min(LEAN_LIMIT, Math.max(-LEAN_LIMIT, away / TILT_REACH)),
  );
}

/**
 * How much steeper the tilt is at `away` from the target: 1 near it, and
 * in proportion to the distance far from it.
 *
 * @internal
 */
export function tiltBoost(away: number) {
  "use gpu";
  return Math.min(
    TILT_BOOST_MAX,
    Math.max(1, Math.abs(away) / TILT_BOOST_REACH) ** TILT_BOOST_POWER,
  );
}

function substep(
  x: Float32Array,
  y: Float32Array,
  vx: Float32Array,
  vy: Float32Array,
  { target, span, aim }: LiquidInput,
  walls: Walls,
  scale: number,
  dt: number,
) {
  const count = x.length;
  const reach = KERNEL_REACH * scale;
  const particleRadius = PARTICLE_RADIUS * scale;
  // The particles are `scale` times further apart, so the pressure must
  // move them `scale` times as far for the same flow.
  const stiffness = STIFFNESS * scale;
  const nearStiffness = NEAR_STIFFNESS * scale;
  const quadratic = VISCOSITY_QUADRATIC / scale;
  const wallDamping = Math.exp(-WALL_GRIP * dt);
  const sideDamping = Math.exp(
    (-WALL_GRIP * dt) / (1 + SIDE_GRIP_SHARE * span),
  );
  let centreX = 0;
  let centreY = 0;
  for (let i = 0; i < count; i++) {
    centreX += x[i] / count;
    centreY += y[i] / count;
  }
  // The tilt is one acceleration for the whole body, as gravity is when a
  // container moves: it must not squeeze the body towards the target.
  const lean = leanTo(target - centreX);
  const arrived = 1 - Math.abs(lean);
  const damping = Math.exp(-(DRAG + SETTLE_DRAG * arrived) * dt);
  const tiltX = TILT * tiltBoost(target - centreX) * lean * dt;
  const tiltY = (AIM_TILT * aim * Math.abs(lean) - CENTRE_PULL * centreY) * dt;
  for (let i = 0; i < count; i++) {
    vx[i] = (vx[i] + tiltX) * damping;
    vy[i] = (vy[i] + tiltY) * damping;
    if (
      wallGap(x[i], y[i], particleRadius, walls.from, walls.to) <
      WALL_GRIP_REACH
    ) {
      const onSide = x[i] > walls.from && x[i] < walls.to;
      vx[i] *= onSide ? sideDamping : wallDamping;
      vy[i] *= onSide ? sideDamping : wallDamping;
    }
  }

  const pairs = findPairs(x, y, reach);
  for (let p = 0; p < pairs; p++) {
    const i = pairI[p];
    const j = pairJ[p];
    const dx = x[j] - x[i];
    const dy = y[j] - y[i];
    const distance = Math.hypot(dx, dy);
    if (distance < 1e-6) {
      continue;
    }
    const ux = dx / distance;
    const uy = dy / distance;
    const inward = (vx[i] - vx[j]) * ux + (vy[i] - vy[j]) * uy;
    if (inward > 0) {
      const q = 1 - distance / reach;
      const impulse =
        dt * q * (VISCOSITY * inward + quadratic * inward * inward);
      const half = Math.min(impulse, inward) / 2;
      vx[i] -= half * ux;
      vy[i] -= half * uy;
      vx[j] += half * ux;
      vy[j] += half * uy;
    }
  }

  previousX.set(x);
  previousY.set(y);
  for (let i = 0; i < count; i++) {
    x[i] += vx[i] * dt;
    y[i] += vy[i] * dt;
  }

  const moved = findPairs(x, y, reach);
  density.fill(0, 0, count);
  nearDensity.fill(0, 0, count);
  for (let p = 0; p < moved; p++) {
    const i = pairI[p];
    const j = pairJ[p];
    const distance = Math.hypot(x[j] - x[i], y[j] - y[i]);
    const q = 1 - distance / reach;
    density[i] += q * q;
    density[j] += q * q;
    nearDensity[i] += q * q * q;
    nearDensity[j] += q * q * q;
  }
  const dtSquared = dt * dt;
  for (let p = 0; p < moved; p++) {
    const i = pairI[p];
    const j = pairJ[p];
    const dx = x[j] - x[i];
    const dy = y[j] - y[i];
    const distance = Math.hypot(dx, dy);
    if (distance < 1e-6) {
      continue;
    }
    const q = 1 - distance / reach;
    const pressure =
      stiffness * (density[i] + density[j] - 2 * REST_DENSITY) * 0.5;
    const nearPressure =
      nearStiffness * (nearDensity[i] + nearDensity[j]) * 0.5;
    const push = (dtSquared * (pressure * q + nearPressure * q * q)) / 2;
    const ux = (dx / distance) * push;
    const uy = (dy / distance) * push;
    x[i] -= ux;
    y[i] -= uy;
    x[j] += ux;
    y[j] += uy;
  }

  for (let i = 0; i < count; i++) {
    const inside = insideTrack(x[i], y[i], particleRadius, walls);
    x[i] = inside.x;
    y[i] = inside.y;
    vx[i] = (x[i] - previousX[i]) / dt;
    vy[i] = (y[i] - previousY[i]) / dt;
  }
}

/**
 * The substeps of one step of `step` seconds on the liquid's clock, as
 * the compute shader runs them: the walls move in behind the liquid, and
 * the particles tilt, slow, press and slide along the walls. Production
 * runs `liquidSimulation` instead. That shader sums the pairs of each
 * particle from the positions at the start of a pass, but this applies each
 * pair in turn, so the two agree in their physics but not bit for bit.
 *
 * @internal
 */
export function simulateLiquid(
  body: LiquidParticles,
  input: LiquidInput,
  scale: number,
  step: number,
): LiquidParticles {
  const count = body.x.length;
  const walls = wallsFor(body, input, scale);
  const x = new Float32Array(body.x);
  const y = new Float32Array(body.y);
  const vx = new Float32Array(body.vx);
  const vy = new Float32Array(body.vy);
  let fastest = 0;
  for (let i = 0; i < count; i++) {
    fastest = Math.max(fastest, Math.hypot(vx[i], vy[i]));
  }
  const substeps = substepCount(step, fastest);
  for (let n = 0; n < substeps; n++) {
    substep(x, y, vx, vy, input, walls, scale, step / substeps);
  }
  return { x, y, vx, vy, from: walls.from, to: walls.to };
}
