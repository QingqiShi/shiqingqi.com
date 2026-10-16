import { LIQUID_SHARED_WGSL } from "./liquid-shared-wgsl.ts";
import { LIQUID_PHYSICS, MAX_SUBSTEPS } from "./step-liquid.ts";

/**
 * The byte size of one `LiquidStep`.
 *
 * @internal
 */
export const LIQUID_STEP_BYTES = 64;

/**
 * The invocations of one workgroup: one body's particles, up to
 * `MAX_PARTICLE_COUNT`, each on an invocation of its own.
 *
 * @internal
 */
export const LIQUID_WORKGROUP_SIZE = 256;

const STEP_WORDS = LIQUID_STEP_BYTES / 4;

/**
 * One body's step this frame, as `simulateLiquid` takes it.
 *
 * @internal
 */
export interface LiquidStep {
  /** The slot of the simulation buffer that holds the body. */
  readonly slot: number;
  readonly count: number;
  readonly target: number;
  readonly span: number;
  readonly aim: number;
  readonly scale: number;
  /** The walls the control gives, which the step moves in only behind the liquid. */
  readonly from: number;
  readonly to: number;
  /** Seconds on the liquid's clock. */
  readonly step: number;
  /** The force on every particle, as `LiquidInput.force` gives it; none for a control. */
  readonly force: readonly [number, number];
  /** The room across the track, up and down, as `LiquidInput.room` gives it; none for a control. */
  readonly room: readonly [number, number];
}

/**
 * Packs the steps in order as `LiquidStep` structs at the start of
 * `buffer`, which must hold at least that many.
 *
 * @internal
 */
export function packLiquidSteps(
  steps: readonly LiquidStep[],
  buffer: ArrayBuffer,
) {
  const floats = new Float32Array(buffer);
  const words = new Uint32Array(buffer);
  for (const [index, step] of steps.entries()) {
    const at = index * STEP_WORDS;
    floats.set([step.target, step.span, step.aim, step.scale], at);
    floats.set([step.from, step.to, step.step, 0], at + 4);
    floats.set([...step.force, ...step.room], at + 8);
    words[at + 12] = step.count;
    words[at + 13] = step.slot;
    words.fill(0, at + 14, at + STEP_WORDS);
  }
}

const wgslFloat = (value: number) => {
  const text = String(value);
  return /[.e]/.test(text) ? text : `${text}.0`;
};

const physicsConstants = Object.entries(LIQUID_PHYSICS)
  .map(([name, value]) => `const ${name} = ${wgslFloat(value)};`)
  .join("\n");

/**
 * The simulation of the Liquid effect: the substeps of `simulateLiquid`,
 * one workgroup per body that moves this frame, with one invocation per
 * particle. The particles sit in workgroup memory for the whole step, and
 * every pass over them is a gather: each invocation sums what the other
 * particles do to its own, in the same order every frame, so the result
 * is the same for the same input and no atomics are needed. The walls
 * are a sum that every invocation makes alike, for the same reason, and
 * the centre of the mass is a sum that the invocations make together, in
 * pairs in a fixed order.
 *
 * @internal
 */
export const LIQUID_COMPUTE_WGSL = /* wgsl */ `${LIQUID_SHARED_WGSL}
${physicsConstants}
const MAX_SUBSTEPS = ${String(MAX_SUBSTEPS)}u;

struct LiquidStep {
  // The pill the liquid is pulled to: its target and its span, the aim
  // across the track, and the reach of the particles.
  pour: vec4f,
  // The walls the control gives, and the step on the liquid's clock.
  room: vec4f,
  // The force on every particle, then the room across the track, up and
  // down: none for a control.
  drive: vec4f,
  count: u32,
  slot: u32,
}

@group(0) @binding(0) var<storage, read> steps: array<LiquidStep>;
@group(0) @binding(1) var<storage, read_write> slots: array<LiquidSlot>;

var<workgroup> position: array<vec2f, LIQUID_MAX_PARTICLES>;
var<workgroup> velocity: array<vec2f, LIQUID_MAX_PARTICLES>;
// Each particle's density and its near density.
var<workgroup> density: array<vec2f, LIQUID_MAX_PARTICLES>;
var<workgroup> substeps: u32;
// Each invocation's share of the centre of the mass, which centreOf adds
// up in pairs.
var<workgroup> centreShare: array<vec2f, ${String(LIQUID_WORKGROUP_SIZE)}>;

fn tiltBoost(away: f32) -> f32 {
  return min(TILT_BOOST_MAX, pow(max(1.0, abs(away) / TILT_BOOST_REACH), TILT_BOOST_POWER));
}

// The lean of the track towards a target away off: the CPU's leanTo. The
// clamp keeps tanh in the range where relaxed math is finite.
fn leanTo(away: f32) -> f32 {
  return tanh(clamp(away / TILT_REACH, -LEAN_LIMIT, LEAN_LIMIT));
}

// The nearest point of the room to point: between the walls along the
// track, and within the room across it, which for a control is the centre
// line.
fn nearestInRoom(point: vec2f, walls: vec2f, room: vec2f) -> vec2f {
  return vec2f(clamp(point.x, walls.x, walls.y), clamp(point.y, -room.x, room.y));
}

// How far a particle of radius is from the wall.
fn wallGap(point: vec2f, radius: f32, walls: vec2f, room: vec2f) -> f32 {
  return 1.0 - radius - length(point - nearestInRoom(point, walls, room));
}

// The nearest point to point that a disk of radius fits in the track.
fn insideTrack(point: vec2f, radius: f32, walls: vec2f, room: vec2f) -> vec2f {
  let near = nearestInRoom(point, walls, room);
  let offset = point - near;
  let distance = length(offset);
  let limit = 1.0 - radius;
  if (distance <= limit) {
    return point;
  }
  return near + offset * (limit / distance);
}

fn centreOf(i: u32, count: u32) -> vec2f {
  var share = vec2f(0.0);
  if (i < count) {
    share = position[i] / f32(count);
  }
  centreShare[i] = share;
  workgroupBarrier();
  for (var half = ${String(LIQUID_WORKGROUP_SIZE / 2)}u; half > 0u; half /= 2u) {
    if (i < half) {
      centreShare[i] += centreShare[i + half];
    }
    workgroupBarrier();
  }
  return centreShare[0];
}

fn substep(i: u32, count: u32, step: LiquidStep, walls: vec2f, dt: f32) {
  let moving = i < count;
  let goal = step.pour.x;
  let span = step.pour.y;
  let aim = step.pour.z;
  let scale = step.pour.w;
  let reach = KERNEL_REACH * scale;
  let reachSquared = reach * reach;
  let particleRadius = PARTICLE_RADIUS * scale;
  // The particles are scale times further apart, so the pressure must
  // move them scale times as far for the same flow.
  let stiffness = STIFFNESS * scale;
  let nearStiffness = NEAR_STIFFNESS * scale;
  let quadratic = VISCOSITY_QUADRATIC / scale;
  let wallDamping = exp(-WALL_GRIP * dt);
  let sideDamping = exp(-WALL_GRIP * dt / (1.0 + SIDE_GRIP_SHARE * span));
  let wetDamping = exp(-WET_GRIP * dt);
  let room = step.drive.zw;
  let roomy = room.x + room.y > 0.0;
  // The tilt is one acceleration for the whole body, as gravity is when a
  // container moves: it must not squeeze the body towards the target.
  let centre = centreOf(i, count);
  let lean = leanTo(goal - centre.x);
  let arrived = 1.0 - abs(lean);
  let damping = exp(-(DRAG + SETTLE_DRAG * arrived) * dt);
  var pull = vec2f(
    TILT * tiltBoost(goal - centre.x) * lean,
    AIM_TILT * aim * abs(lean) - CENTRE_PULL * centre.y,
  );
  if (roomy) {
    // With room across the track, a spring pulls the body to its rest, and
    // the force drives the whole body.
    pull = ROOM_SPRING * vec2f(goal - centre.x, -centre.y) + step.drive.xy;
  }
  let tilt = pull * dt;
  if (moving) {
    let point = position[i];
    var v = (velocity[i] + tilt) * damping;
    if (wallGap(point, particleRadius, walls, room) < WALL_GRIP_REACH) {
      let onSide = point.x > walls.x && point.x < walls.y;
      v *= select(wallDamping, sideDamping, onSide);
    }
    if (roomy && abs(point.y) < WET_BAND) {
      v *= wetDamping;
    }
    velocity[i] = v;
  }
  workgroupBarrier();

  var impulse = vec2f(0.0);
  if (moving) {
    let point = position[i];
    let v = velocity[i];
    for (var j = 0u; j < count; j += 1u) {
      let offset = position[j] - point;
      let distanceSquared = dot(offset, offset);
      if (j == i || distanceSquared >= reachSquared) {
        continue;
      }
      let distance = sqrt(distanceSquared);
      if (distance < 1e-6) {
        continue;
      }
      let u = offset / distance;
      let inward = dot(v - velocity[j], u);
      if (inward > 0.0) {
        let q = 1.0 - distance / reach;
        let half = min(dt * q * (VISCOSITY * inward + quadratic * inward * inward), inward) / 2.0;
        impulse -= half * u;
      }
    }
  }
  workgroupBarrier();

  var previous = vec2f(0.0);
  if (moving) {
    let v = velocity[i] + impulse;
    previous = position[i];
    velocity[i] = v;
    position[i] = previous + v * dt;
  }
  workgroupBarrier();

  if (moving) {
    let point = position[i];
    var sum = vec2f(0.0);
    for (var j = 0u; j < count; j += 1u) {
      let offset = position[j] - point;
      let distanceSquared = dot(offset, offset);
      if (j == i || distanceSquared >= reachSquared) {
        continue;
      }
      let q = 1.0 - sqrt(distanceSquared) / reach;
      sum += vec2f(q * q, q * q * q);
    }
    density[i] = sum;
  }
  workgroupBarrier();

  var push = vec2f(0.0);
  if (moving) {
    let point = position[i];
    let own = density[i];
    let dtSquared = dt * dt;
    for (var j = 0u; j < count; j += 1u) {
      let offset = position[j] - point;
      let distanceSquared = dot(offset, offset);
      if (j == i || distanceSquared >= reachSquared) {
        continue;
      }
      let distance = sqrt(distanceSquared);
      if (distance < 1e-6) {
        continue;
      }
      let q = 1.0 - distance / reach;
      let other = density[j];
      let pressure = stiffness * (own.x + other.x - 2.0 * REST_DENSITY) * 0.5;
      let nearPressure = nearStiffness * (own.y + other.y) * 0.5;
      push -= offset / distance * (dtSquared * (pressure * q + nearPressure * q * q) / 2.0);
    }
  }
  workgroupBarrier();

  if (moving) {
    let point = insideTrack(position[i] + push, particleRadius, walls, room);
    position[i] = point;
    velocity[i] = (point - previous) / dt;
  }
  workgroupBarrier();
}

@compute @workgroup_size(${String(LIQUID_WORKGROUP_SIZE)})
fn simulate(
  @builtin(workgroup_id) group: vec3u,
  @builtin(local_invocation_index) i: u32,
) {
  let step = steps[group.x];
  let count = step.count;
  let slot = step.slot;
  let moving = i < count;
  if (moving) {
    let particle = slots[slot].particles[i];
    position[i] = particle.xy;
    velocity[i] = particle.zw;
  }
  workgroupBarrier();

  // The walls for this step: the control's, but a wall that moves in stops
  // where it would push a particle, and moves in only as the liquid leaves.
  let reach = 1.0 - PARTICLE_RADIUS * step.pour.w;
  var leftmost = 1e30;
  var rightmost = -1e30;
  var fastest = 0.0;
  for (var j = 0u; j < count; j += 1u) {
    let point = position[j];
    let dy = point.y - clamp(point.y, -step.drive.z, step.drive.w);
    let across = sqrt(max(0.0, reach * reach - dy * dy));
    leftmost = min(leftmost, point.x + across);
    rightmost = max(rightmost, point.x - across);
    fastest = max(fastest, length(velocity[j]));
  }
  let held = slots[slot].walls.xy;
  let walls = vec2f(
    select(min(step.room.x, leftmost), step.room.x, step.room.x <= held.x),
    select(max(step.room.y, rightmost), step.room.y, step.room.y >= held.y),
  );
  let seconds = step.room.z;
  if (i == 0u) {
    substeps = min(MAX_SUBSTEPS, max(max(1u, u32(ceil(seconds / SUBSTEP))), u32(ceil(seconds * fastest / SUBSTEP_MOVE))));
  }
  workgroupBarrier();
  let n = workgroupUniformLoad(&substeps);
  let dt = seconds / f32(n);
  for (var k = 0u; k < n; k += 1u) {
    substep(i, count, step, walls, dt);
  }

  if (moving) {
    slots[slot].particles[i] = vec4f(position[i], velocity[i]);
  }
  if (i == 0u) {
    var least = 1e30;
    var greatest = -1e30;
    for (var j = 0u; j < count; j += 1u) {
      least = min(least, position[j].x);
      greatest = max(greatest, position[j].x);
    }
    slots[slot].walls = vec4f(walls, least, greatest);
  }
}
`;
