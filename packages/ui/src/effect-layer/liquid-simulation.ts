import { d, std, tgpu } from "typegpu";
import type { LiquidStep } from "./liquid-layout.ts";
import { LiquidParticle, liquidSimulationLayout } from "./liquid-layout.ts";
import {
  AIM_TILT,
  CENTRE_PULL,
  DRAG,
  KERNEL_REACH,
  leanTo,
  MAX_PARTICLE_COUNT,
  NEAR_STIFFNESS,
  PARTICLE_RADIUS,
  REST_DENSITY,
  SETTLE_DRAG,
  SIDE_GRIP_SHARE,
  STIFFNESS,
  substepCount,
  TILT,
  tiltBoost,
  VISCOSITY,
  VISCOSITY_QUADRATIC,
  WALL_GRIP,
  WALL_GRIP_REACH,
  wallGap,
} from "./step-liquid.ts";

/**
 * The invocations of one workgroup: one body's particles, up to
 * `MAX_PARTICLE_COUNT`, each on an invocation of its own.
 */
const LIQUID_WORKGROUP_SIZE = 256;

const position = tgpu.workgroupVar(d.arrayOf(d.vec2f, MAX_PARTICLE_COUNT));
const velocity = tgpu.workgroupVar(d.arrayOf(d.vec2f, MAX_PARTICLE_COUNT));
/** Each particle's density and its near density. */
const density = tgpu.workgroupVar(d.arrayOf(d.vec2f, MAX_PARTICLE_COUNT));
const substeps = tgpu.workgroupVar(d.u32);
/** Each invocation's share of the centre of the mass, which `centreOf` adds up in pairs. */
const centreShare = tgpu.workgroupVar(
  d.arrayOf(d.vec2f, LIQUID_WORKGROUP_SIZE),
);

/** The nearest point to `point` that a disk of `radius` fits in the track. */
const insideTrack = (point: d.v2f, radius: number, walls: d.v2f) => {
  "use gpu";
  const nearX = std.clamp(point.x, walls.x, walls.y);
  const offset = d.vec2f(point.x - nearX, point.y);
  const distance = std.length(offset);
  const limit = 1 - radius;
  if (distance <= limit) {
    return d.vec2f(point);
  }
  return d.vec2f(nearX, 0).add(offset.mul(limit / distance));
};

const centreOf = (i: number, count: number) => {
  "use gpu";
  let share = d.vec2f(0);
  if (i < count) {
    share = position.$[i].div(d.f32(count));
  }
  centreShare.$[i] = d.vec2f(share);
  std.workgroupBarrier();
  for (
    let half = d.u32(LIQUID_WORKGROUP_SIZE / 2);
    half > 0;
    half = half >>> 1
  ) {
    if (i < half) {
      centreShare.$[i] = centreShare.$[i].add(centreShare.$[i + half]);
    }
    std.workgroupBarrier();
  }
  return d.vec2f(centreShare.$[0]);
};

const substep = (
  i: number,
  count: number,
  step: d.Infer<typeof LiquidStep>,
  walls: d.v2f,
  dt: number,
) => {
  "use gpu";
  const moving = i < count;
  const goal = step.goal;
  const span = step.span;
  const aim = step.aim;
  const scale = step.scale;
  const reach = KERNEL_REACH * scale;
  const reachSquared = reach * reach;
  const particleRadius = PARTICLE_RADIUS * scale;
  // The particles are scale times further apart, so the pressure must
  // move them scale times as far for the same flow.
  const stiffness = STIFFNESS * scale;
  const nearStiffness = NEAR_STIFFNESS * scale;
  const quadratic = VISCOSITY_QUADRATIC / scale;
  const wallDamping = std.exp(-WALL_GRIP * dt);
  const sideDamping = std.exp((-WALL_GRIP * dt) / (1 + SIDE_GRIP_SHARE * span));
  // The tilt is one acceleration for the whole body, as gravity is when a
  // container moves: it must not squeeze the body towards the target.
  const centre = centreOf(i, count);
  const lean = leanTo(goal - centre.x);
  const arrived = 1 - std.abs(lean);
  const damping = std.exp(-(DRAG + SETTLE_DRAG * arrived) * dt);
  const tilt = d
    .vec2f(
      TILT * tiltBoost(goal - centre.x) * lean,
      AIM_TILT * aim * std.abs(lean) - CENTRE_PULL * centre.y,
    )
    .mul(dt);
  if (moving) {
    const point = position.$[i];
    let v = velocity.$[i].add(tilt).mul(damping);
    if (
      wallGap(point.x, point.y, particleRadius, walls.x, walls.y) <
      WALL_GRIP_REACH
    ) {
      const onSide = point.x > walls.x && point.x < walls.y;
      v = v.mul(std.select(wallDamping, sideDamping, onSide));
    }
    velocity.$[i] = d.vec2f(v);
  }
  std.workgroupBarrier();

  let impulse = d.vec2f(0);
  if (moving) {
    const point = position.$[i];
    const v = velocity.$[i];
    for (let j = d.u32(0); j < count; j += 1) {
      const offset = position.$[j].sub(point);
      const distanceSquared = std.dot(offset, offset);
      if (j === i || distanceSquared >= reachSquared) {
        continue;
      }
      const distance = std.sqrt(distanceSquared);
      if (distance < 1e-6) {
        continue;
      }
      const u = offset.div(distance);
      const inward = std.dot(v.sub(velocity.$[j]), u);
      if (inward > 0) {
        const q = 1 - distance / reach;
        const half =
          std.min(
            dt * q * (VISCOSITY * inward + quadratic * inward * inward),
            inward,
          ) / 2;
        impulse = impulse.sub(u.mul(half));
      }
    }
  }
  std.workgroupBarrier();

  let previous = d.vec2f(0);
  if (moving) {
    const v = velocity.$[i].add(impulse);
    previous = d.vec2f(position.$[i]);
    velocity.$[i] = d.vec2f(v);
    position.$[i] = previous.add(v.mul(dt));
  }
  std.workgroupBarrier();

  if (moving) {
    const point = position.$[i];
    let sum = d.vec2f(0);
    for (let j = d.u32(0); j < count; j += 1) {
      const offset = position.$[j].sub(point);
      const distanceSquared = std.dot(offset, offset);
      if (j === i || distanceSquared >= reachSquared) {
        continue;
      }
      const q = 1 - std.sqrt(distanceSquared) / reach;
      sum = sum.add(d.vec2f(q * q, q * q * q));
    }
    density.$[i] = d.vec2f(sum);
  }
  std.workgroupBarrier();

  let push = d.vec2f(0);
  if (moving) {
    const point = position.$[i];
    const own = density.$[i];
    const dtSquared = dt * dt;
    for (let j = d.u32(0); j < count; j += 1) {
      const offset = position.$[j].sub(point);
      const distanceSquared = std.dot(offset, offset);
      if (j === i || distanceSquared >= reachSquared) {
        continue;
      }
      const distance = std.sqrt(distanceSquared);
      if (distance < 1e-6) {
        continue;
      }
      const q = 1 - distance / reach;
      const other = density.$[j];
      const pressure = stiffness * (own.x + other.x - 2 * REST_DENSITY) * 0.5;
      const nearPressure = nearStiffness * (own.y + other.y) * 0.5;
      push = push.sub(
        offset
          .div(distance)
          .mul((dtSquared * (pressure * q + nearPressure * q * q)) / 2),
      );
    }
  }
  std.workgroupBarrier();

  if (moving) {
    const point = insideTrack(position.$[i].add(push), particleRadius, walls);
    position.$[i] = d.vec2f(point);
    velocity.$[i] = point.sub(previous).div(dt);
  }
  std.workgroupBarrier();
};

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
export const liquidSimulation = tgpu.computeFn({
  in: {
    group: d.builtin.workgroupId,
    invocation: d.builtin.localInvocationIndex,
  },
  workgroupSize: [LIQUID_WORKGROUP_SIZE],
})((input) => {
  "use gpu";
  const i = input.invocation;
  const step = liquidSimulationLayout.$.steps[input.group.x];
  const count = step.count;
  const slot = step.slot;
  const moving = i < count;
  if (moving) {
    const particle = liquidSimulationLayout.$.slots[slot].particles[i];
    position.$[i] = d.vec2f(particle.position);
    velocity.$[i] = d.vec2f(particle.velocity);
  }
  std.workgroupBarrier();

  // The walls for this step: the control's, but a wall that moves in stops
  // where it would push a particle, and moves in only as the liquid leaves.
  const reach = 1 - PARTICLE_RADIUS * step.scale;
  let leftmost = d.f32(1e30);
  let rightmost = d.f32(-1e30);
  let fastest = d.f32(0);
  for (let j = d.u32(0); j < count; j += 1) {
    const point = position.$[j];
    const across = std.sqrt(std.max(0, reach * reach - point.y * point.y));
    leftmost = std.min(leftmost, point.x + across);
    rightmost = std.max(rightmost, point.x - across);
    fastest = std.max(fastest, std.length(velocity.$[j]));
  }
  const held = liquidSimulationLayout.$.slots[slot].walls;
  const room = step.walls;
  const walls = d.vec2f(
    std.select(std.min(room.x, leftmost), room.x, room.x <= held.x),
    std.select(std.max(room.y, rightmost), room.y, room.y >= held.y),
  );
  const seconds = step.seconds;
  if (i === 0) {
    substeps.$ = d.u32(substepCount(seconds, fastest));
  }
  std.workgroupBarrier();
  const n = std.workgroupUniformLoad(substeps.$);
  const dt = seconds / d.f32(n);
  for (let k = d.u32(0); k < n; k += 1) {
    substep(i, count, step, walls, dt);
  }

  if (moving) {
    liquidSimulationLayout.$.slots[slot].particles[i] = LiquidParticle({
      position: position.$[i],
      velocity: velocity.$[i],
    });
  }
  if (i === 0) {
    let least = d.f32(1e30);
    let greatest = d.f32(-1e30);
    for (let j = d.u32(0); j < count; j += 1) {
      least = std.min(least, position.$[j].x);
      greatest = std.max(greatest, position.$[j].x);
    }
    liquidSimulationLayout.$.slots[slot].walls = d.vec2f(walls);
    liquidSimulationLayout.$.slots[slot].extent = d.vec2f(least, greatest);
  }
});
