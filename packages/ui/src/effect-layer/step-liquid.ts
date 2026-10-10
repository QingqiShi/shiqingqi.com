/**
 * The liquid of a Switch's thumb, as a particle fluid in track space: `x`
 * runs along the travel from the centre of the off position, `y` from the
 * centre line, both in units of the thumb's rest radius, so the same
 * numbers serve every size. The track holds the liquid inside its padding:
 * every point within 1 of the segment from `(0, 0)` to `(travel, 0)`.
 *
 * The fluid is Clavet, Beaudoin and Poulin's double density relaxation: each
 * step moves the particles, then pushes them apart where they are denser
 * than at rest and pulls them together where they are sparser, with a near
 * density that keeps the surface tight, the way surface tension keeps a
 * drop whole. A toggle tilts the track: a body force pulls every particle
 * towards the target, the liquid pours over, piles against the far end,
 * and sloshes until viscosity has taken its motion.
 *
 * @internal
 */
export interface LiquidBody {
  readonly x: Float32Array;
  readonly y: Float32Array;
  /** Units of the rest radius per second. */
  readonly vx: Float32Array;
  readonly vy: Float32Array;
  /**
   * How far the drawn surface has settled into the thumb's circle, from 0
   * while the liquid is on its way to 1 once it has arrived.
   */
  readonly calm: number;
  /**
   * How frozen the thumb is, from 0 as clear water to 1 as frosted ice:
   * it thaws when it is pressed or starts to move, and freezes again as it
   * settles into the thumb's circle, at the same pace.
   */
  readonly set: number;
  /** Nothing moves any more, so no frame needs to follow for the body. */
  readonly settled: boolean;
  readonly beads: readonly LiquidBead[];
  /** Where the trailing edge last shed a bead. */
  readonly shedAt: number;
  readonly seed: number;
}

/**
 * A bead of liquid on the track. It swells out of the trailing edge, where
 * the body draws it on with a neck, until it pinches off. The tilt moves it
 * on towards the target, slower than the body because the track holds it
 * back more, so it falls behind on the way and catches up once the body has
 * landed, and the body absorbs it where it covers it. Until then it
 * evaporates: it shrinks over its life.
 *
 * @internal
 */
export interface LiquidBead {
  readonly x: number;
  readonly y: number;
  /** Along the travel, in units of the rest radius per second. */
  readonly vx: number;
  /** In units of the rest radius, when it is fully out. */
  readonly radius: number;
  readonly age: number;
  readonly life: number;
  /** It has pinched off from the body. */
  readonly free: boolean;
}

/**
 * What one step reads from the Switch.
 *
 * @internal
 */
export interface LiquidInput {
  /** Where the liquid is pulled to, along the travel. */
  readonly target: number;
  /** How far the thumb's centre travels between off and on. */
  readonly travel: number;
  /** A pointer is down on the Switch, so the thumb stays melted. */
  readonly pressed: boolean;
  readonly reducedMotion: boolean;
  /**
   * Where the press that sent the liquid was across the track, from -1 at
   * its top to 1 at its bottom. While the liquid pours, the track also tilts
   * a little across towards it, so the liquid lands higher or lower on the
   * far end. A toggle with no press point aims at 0, the centre line.
   */
  readonly aim: number;
}

/** @internal */
export const PARTICLE_COUNT = 150;

/**
 * The reach of a particle's density, in units of the rest radius. The
 * drawn surface uses the same reach, so that the surface it finds matches
 * the rest circle.
 *
 * @internal
 */
export const KERNEL_REACH = 0.42;

/** The disk the particles fill at rest, inside the wall by one particle. */
const PARTICLE_SPACING = Math.sqrt(Math.PI / PARTICLE_COUNT) * 0.93;
const PARTICLE_RADIUS = PARTICLE_SPACING / 2;
const REST_RADIUS = 1 - PARTICLE_RADIUS;
const SUBSTEP = 1 / 240;
const MAX_STEP = 1 / 30;
/**
 * The liquid's clock runs this many times faster than the page's: every
 * rate here is per second of the liquid's clock, so the whole pour, its
 * beads and its setting speed up together and the physics stays the same.
 */
const PACE = 1.5;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

const STIFFNESS = 150;
const NEAR_STIFFNESS = 500;
const VISCOSITY = 6;
const VISCOSITY_QUADRATIC = 0.5;
/** Per second, on every particle: the liquid's loss to the track. */
const DRAG = 2.5;
/**
 * Per second, more loss once the body has come to its target, so that the
 * slosh after it lands dies away soon.
 */
const SETTLE_DRAG = 6;
/** The tilt towards the target, in rest radii per second squared. */
const TILT = 56;
/** Within this reach of the target the tilt eases off. */
const TILT_REACH = 0.4;
/**
 * The tilt across the track at a full `aim`, in rest radii per second
 * squared, while the liquid pours. It moves the body only a little across,
 * but enough that it lands well off the middle of the far end.
 */
const AIM_TILT = 6;
/** A weak pull to the centre line, so the body sits on it at rest. */
const CENTRE_PULL = 4;
/**
 * The liquid wets the wall it touches: per second, how fast a particle
 * within `WALL_GRIP_REACH` of the wall loses its speed, so that the front
 * pins where it lands and the mass behind it sloshes.
 */
const WALL_GRIP = 12;
const WALL_GRIP_REACH = 0.08;

/** Below this mean speed, in rest radii per second, the liquid is still. */
const STILL_SPEED = 0.3;
/**
 * The liquid has arrived once the centre of its mass is this near the
 * target, in rest radii: as it lands on the far end.
 */
const ARRIVE_REACH = 0.2;
/**
 * Per second: how fast the liquid that has arrived settles into the
 * thumb's circle and freezes, both at once, so that they are one change
 * while it comes to rest.
 */
const SETTLE = 2;
const CALM_FALL = 16;
/** Per second: how fast the thumb thaws into water. */
const MELT = 6;

/** The trailing edge sheds at most one bead each time it moves this far. */
const SHED_SPACING = 0.21;
const SHED_CHANCE = 0.9;
/** The trailing edge sheds only when it moves faster than this. */
const SHED_SPEED = 1;
/**
 * The body sheds nothing within this reach of its target, so that a bead it
 * sheds as it lands does not join the beads behind it to the body.
 */
const SHED_REACH = 0.7;
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

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/**
 * The mean of the values: of a body's `x` or `y`, the centre of the
 * liquid's mass along or across the track.
 *
 * @internal
 */
export function mean(values: ArrayLike<number>) {
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
  }
  return sum / values.length;
}

/** The density at the centre of the rest disk. */
function restDensity() {
  const [x, y] = restPositions(0);
  let density = 0;
  for (let j = 0; j < PARTICLE_COUNT; j++) {
    const distance = Math.hypot(x[j], y[j]);
    if (distance < KERNEL_REACH) {
      const q = 1 - distance / KERNEL_REACH;
      density += q * q;
    }
  }
  return density;
}

const REST_DENSITY = restDensity();

/** The particles laid out evenly over the rest disk, centred at `centre`. */
function restPositions(centre: number): [Float32Array, Float32Array] {
  const x = new Float32Array(PARTICLE_COUNT);
  const y = new Float32Array(PARTICLE_COUNT);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const radius = REST_RADIUS * Math.sqrt((i + 0.5) / PARTICLE_COUNT);
    const angle = i * GOLDEN_ANGLE;
    x[i] = centre + radius * Math.cos(angle);
    y[i] = radius * Math.sin(angle);
  }
  return [x, y];
}

/**
 * The liquid at rest at `target`.
 *
 * @internal
 */
export function restingLiquid(target: number, seed = 1): LiquidBody {
  const [x, y] = restPositions(target);
  return {
    x,
    y,
    vx: new Float32Array(PARTICLE_COUNT),
    vy: new Float32Array(PARTICLE_COUNT),
    calm: 1,
    set: 1,
    settled: true,
    beads: [],
    shedAt: target,
    seed,
  };
}

/** The particles this near the wall of an end count as where the liquid meets it. */
const IMPACT_BAND = 0.15;

/**
 * Where the liquid lands on the wall at the on end of the track, at `end`,
 * or `null` while it does not touch that wall: the middle of the particles
 * that meet the wall there, pushed out onto the wall.
 *
 * @internal
 */
export function impactOn(body: LiquidBody, end: number) {
  const limit = 1 - PARTICLE_RADIUS - 0.03;
  let touches = false;
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const dx = body.x[i] - end;
    if (dx <= 0) {
      continue;
    }
    const distance = Math.hypot(dx, body.y[i]);
    touches ||= distance >= limit;
    if (distance >= limit - IMPACT_BAND) {
      sumX += dx;
      sumY += body.y[i];
    }
  }
  if (!touches) {
    return null;
  }
  const length = Math.hypot(sumX, sumY);
  return { x: end + sumX / length, y: sumY / length };
}

/** How far a particle is from the wall, which is one particle out. */
function wallGap(x: number, y: number, travel: number) {
  const nearX = Math.max(0, Math.min(travel, x));
  return 1 - PARTICLE_RADIUS - Math.hypot(x - nearX, y);
}

/** The nearest point to `(x, y)` that a disk of `radius` fits in the track. */
function insideTrack(x: number, y: number, radius: number, travel: number) {
  const nearX = Math.max(0, Math.min(travel, x));
  const dx = x - nearX;
  const distance = Math.hypot(dx, y);
  const limit = 1 - radius;
  if (distance <= limit) {
    return { x, y };
  }
  const scale = limit / distance;
  return { x: nearX + dx * scale, y: y * scale };
}

const pairI = new Int32Array(PARTICLE_COUNT * PARTICLE_COUNT);
const pairJ = new Int32Array(PARTICLE_COUNT * PARTICLE_COUNT);
const density = new Float32Array(PARTICLE_COUNT);
const nearDensity = new Float32Array(PARTICLE_COUNT);
const previousX = new Float32Array(PARTICLE_COUNT);
const previousY = new Float32Array(PARTICLE_COUNT);

/** Lists every pair within the kernel's reach; returns how many. */
function findPairs(x: Float32Array, y: Float32Array) {
  let count = 0;
  const reach = KERNEL_REACH * KERNEL_REACH;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    for (let j = i + 1; j < PARTICLE_COUNT; j++) {
      const dx = x[j] - x[i];
      const dy = y[j] - y[i];
      if (dx * dx + dy * dy < reach) {
        pairI[count] = i;
        pairJ[count] = j;
        count++;
      }
    }
  }
  return count;
}

function substep(
  x: Float32Array,
  y: Float32Array,
  vx: Float32Array,
  vy: Float32Array,
  { target, travel, aim }: LiquidInput,
  dt: number,
) {
  const wallDamping = Math.exp(-WALL_GRIP * dt);
  let centreX = 0;
  let centreY = 0;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    centreX += x[i] / PARTICLE_COUNT;
    centreY += y[i] / PARTICLE_COUNT;
  }
  // The tilt is one acceleration for the whole body, as gravity is when a
  // container moves: it must not squeeze the body towards the target.
  const lean = Math.tanh((target - centreX) / TILT_REACH);
  const arrived = 1 - Math.abs(lean);
  const damping = Math.exp(-(DRAG + SETTLE_DRAG * arrived) * dt);
  const tiltX = TILT * lean * dt;
  const tiltY = (AIM_TILT * aim * Math.abs(lean) - CENTRE_PULL * centreY) * dt;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    vx[i] = (vx[i] + tiltX) * damping;
    vy[i] = (vy[i] + tiltY) * damping;
    if (wallGap(x[i], y[i], travel) < WALL_GRIP_REACH) {
      vx[i] *= wallDamping;
      vy[i] *= wallDamping;
    }
  }

  const pairs = findPairs(x, y);
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
      const q = 1 - distance / KERNEL_REACH;
      const impulse =
        dt * q * (VISCOSITY * inward + VISCOSITY_QUADRATIC * inward * inward);
      const half = Math.min(impulse, inward) / 2;
      vx[i] -= half * ux;
      vy[i] -= half * uy;
      vx[j] += half * ux;
      vy[j] += half * uy;
    }
  }

  previousX.set(x);
  previousY.set(y);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    x[i] += vx[i] * dt;
    y[i] += vy[i] * dt;
  }

  const moved = findPairs(x, y);
  density.fill(0);
  nearDensity.fill(0);
  for (let p = 0; p < moved; p++) {
    const i = pairI[p];
    const j = pairJ[p];
    const distance = Math.hypot(x[j] - x[i], y[j] - y[i]);
    const q = 1 - distance / KERNEL_REACH;
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
    const q = 1 - distance / KERNEL_REACH;
    const pressure =
      STIFFNESS * (density[i] + density[j] - 2 * REST_DENSITY) * 0.5;
    const nearPressure =
      NEAR_STIFFNESS * (nearDensity[i] + nearDensity[j]) * 0.5;
    const push = (dtSquared * (pressure * q + nearPressure * q * q)) / 2;
    const ux = (dx / distance) * push;
    const uy = (dy / distance) * push;
    x[i] -= ux;
    y[i] -= uy;
    x[j] += ux;
    y[j] += uy;
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const inside = insideTrack(x[i], y[i], PARTICLE_RADIUS, travel);
    x[i] = inside.x;
    y[i] = inside.y;
    vx[i] = (x[i] - previousX[i]) / dt;
    vy[i] = (y[i] - previousY[i]) / dt;
  }
}

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
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    nearest = Math.min(nearest, Math.hypot(body.x[i] - x, body.y[i] - y));
  }
  return nearest;
}

/**
 * Moves and ages the beads: the tilt towards `target` moves them on, and
 * the track holds them back. A bead pinches off once the body has drawn
 * away from it, and the body absorbs a bead that has pinched off once it
 * covers its centre: the bead shrinks into it. As the body settles, it
 * absorbs each bead once the bead is all in the thumb's circle at `target`.
 * Drops the beads that have evaporated or been absorbed.
 */
function moveBeads(
  beads: readonly LiquidBead[],
  body: { x: Float32Array; y: Float32Array },
  delta: number,
  travel: number,
  target: number,
  settling: boolean,
) {
  const kept: LiquidBead[] = [];
  for (const bead of beads) {
    const age = bead.age + delta;
    if (age >= bead.life) {
      continue;
    }
    const tilt = TILT * Math.tanh((target - bead.x) / TILT_REACH) * delta;
    const held = Math.min(BEAD_FRICTION * delta, Math.abs(bead.vx + tilt));
    const vx = bead.vx + tilt - Math.sign(bead.vx + tilt) * held;
    const drawn = beadRadius({ ...bead, age });
    const { x, y } = insideTrack(bead.x + vx * delta, bead.y, drawn, travel);
    const nearest = nearestParticle(body, x, y);
    const gap = nearest - PARTICLE_RADIUS - drawn;
    const free =
      bead.free || (age > BEAD_GROW && gap > (NECK_REACH * drawn) / 2);
    const absorbed = settling
      ? Math.hypot(x - target, y) + drawn < 1
      : free && nearest < PARTICLE_SPACING;
    const radius = absorbed
      ? bead.radius * Math.exp(-ABSORB * delta)
      : bead.radius;
    if (radius > GONE_RADIUS) {
      kept.push({ x, y, vx, radius, age, life: bead.life, free });
    }
  }
  return kept;
}

type Shedding = Pick<LiquidBody, "beads" | "shedAt" | "seed">;

/**
 * Sheds a bead from the trailing edge when the body has `moved` far enough
 * since the last one. The bead starts at a particle on the trailing edge,
 * inside the body, and swells out of it.
 */
function shed(
  last: Shedding,
  x: Float32Array,
  y: Float32Array,
  moved: number,
  step: number,
): Shedding {
  const trailing = moved > 0 ? Math.min(...x) : Math.max(...x);
  if (moved === 0 || Math.abs(trailing - last.shedAt) < SHED_SPACING) {
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
  for (let i = 0; i < PARTICLE_COUNT; i++) {
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

/**
 * Moves the liquid on by `delta` seconds. Under reduced motion it goes
 * straight to the target as the frozen thumb and sheds nothing.
 *
 * @internal
 */
export function stepLiquid(
  body: LiquidBody,
  input: LiquidInput,
  delta: number,
): LiquidBody {
  const { target, travel, pressed } = input;
  if (input.reducedMotion) {
    return restingLiquid(target, body.seed);
  }
  const step = Math.min(delta, MAX_STEP) * PACE;
  const x = new Float32Array(body.x);
  const y = new Float32Array(body.y);
  const vx = new Float32Array(body.vx);
  const vy = new Float32Array(body.vy);
  const count = Math.max(1, Math.ceil(step / SUBSTEP));
  for (let n = 0; n < count; n++) {
    substep(x, y, vx, vy, input, step / count);
  }
  let speedSum = 0;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    speedSum += Math.hypot(vx[i], vy[i]);
  }
  const speed = speedSum / PARTICLE_COUNT;
  const centre = mean(x);
  const away = Math.abs(target - centre);
  const arrived = away < ARRIVE_REACH;
  const calm = clamp01(body.calm + (arrived ? SETTLE : -CALM_FALL) * step);
  const set = clamp01(body.set + (arrived && !pressed ? SETTLE : -MELT) * step);
  const kept: Shedding = {
    beads: moveBeads(body.beads, { x, y }, step, travel, target, arrived),
    shedAt: body.shedAt,
    seed: body.seed,
  };
  const { beads, shedAt, seed } =
    speed < SHED_SPEED || away < SHED_REACH
      ? kept
      : shed(kept, x, y, centre - mean(body.x), step);
  const settled =
    calm >= 1 &&
    speed < STILL_SPEED &&
    set === (pressed ? 0 : 1) &&
    beads.length === 0;
  if (settled) {
    vx.fill(0);
    vy.fill(0);
  }
  return { x, y, vx, vy, calm, set, settled, beads, shedAt, seed };
}
