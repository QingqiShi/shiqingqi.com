import { DUST_SHARED_WGSL } from "./dust-shared-wgsl.ts";
import { PAGE_WGSL } from "./page-wgsl.ts";
import { DUST_MAX_LIFE } from "./schedule-dust-spawns.ts";

/**
 * The byte size of the uniform buffer behind `simulation`.
 *
 * @internal
 */
export const DUST_SIMULATION_BYTES = 16;

/** @internal */
export const DUST_WORKGROUP_SIZE = 64;

/**
 * The simulation, one invocation per slot that can hold a live particle: it
 * sheds the particles of the spawn list into the newest slots, then moves
 * every live one.
 *
 * - A particle leaves its element's edge slowly and floats on a soft curl
 *   noise field, like dust in still air.
 * - After a few seconds the air of every extractor fan in reach takes it: a
 *   sink flow, faster closer to the fan's edge, so it accelerates on the way
 *   in. It dies at the edge.
 * - Every other registered element is an obstacle that it slides around.
 * - A moving pointer drags the air near it.
 *
 * @internal
 */
export const DUST_COMPUTE_WGSL = /* wgsl */ `${PAGE_WGSL}
${DUST_SHARED_WGSL}

// The slots that can hold a live particle, from firstSlot on round the
// ring; the last bornCount of them are shed this frame.
struct DustSimulation {
  firstSlot: u32,
  liveCount: u32,
  bornCount: u32,
  frame: u32,
}

@group(1) @binding(0) var<uniform> simulation: DustSimulation;
@group(1) @binding(1) var<storage, read_write> particles: array<DustParticle>;
@group(1) @binding(2) var<storage, read> spawns: array<u32>;
@group(1) @binding(3) var<storage, read> dustElements: array<DustElement>;

// CSS px per second, or seconds.
const MAX_LIFE = ${DUST_MAX_LIFE.toFixed(1)};
const BIRTH_SPEED = 26.0;
const LIFE_MIN = 4.0;
const LIFE_MAX = 7.0;
const DRIFT_MIN = 0.6;
const DRIFT_MAX = 1.8;
const ENTRAIN_SECONDS = 1.4;
const NOISE_SCALE = 220.0;
const DRIFT_SPEED = 20.0;
const RISE_SPEED = 3.0;
// How fast a particle takes on the speed of the air around it, per second:
// loosely while it floats, closely once a fan pulls it.
const COUPLING_FLOATING = 1.2;
const COUPLING_PULLED = 6.0;
// The sink flow: INTAKE_SPEED at the fan's edge, and half that at a share
// INTAKE_RADIUS of its reach out.
const INTAKE_SPEED = 620.0;
const INTAKE_RADIUS = 0.4;
const INTAKE_FADE = 12.0;
// How far the air turns aside as it goes in, as a share of its speed.
const SWIRL = 0.12;
const ABSORB_DISTANCE = 1.0;
// The air parts around an obstacle within OBSTACLE_RANGE of its edge, so dust
// flows round it with some room to spare.
const OBSTACLE_RANGE = 28.0;
const OBSTACLE_PUSH = 30.0;
// How far the parting point moves with air that leans along the edge, as the
// seconds the air takes to get there.
const LEAN_SECONDS = 0.15;
// Per second, for each CSS px a particle is inside an obstacle.
const OBSTACLE_ESCAPE = 9.0;
const POINTER_RADIUS = 90.0;
const POINTER_DRAG = 3.5;
const POINTER_FULL_SPEED = 150.0;
const DOCUMENT_MARGIN = 64.0;
// A particle that a fan pulls faster than this lives until it gets there.
const PULLED_SPEED = 20.0;

fn gradientAt(cell: vec2i) -> vec2f {
  let hash = pcg(bitcast<u32>(cell.x) ^ pcg(bitcast<u32>(cell.y)));
  let angle = f32(hash) * (6.2831853 / 4294967295.0);
  return vec2f(cos(angle), sin(angle));
}

fn gradientNoise(point: vec2f) -> f32 {
  let cell = vec2i(floor(point));
  let local = fract(point);
  let blend = local * local * (3.0 - 2.0 * local);
  let a = dot(gradientAt(cell), local);
  let b = dot(gradientAt(cell + vec2i(1, 0)), local - vec2f(1.0, 0.0));
  let c = dot(gradientAt(cell + vec2i(0, 1)), local - vec2f(0.0, 1.0));
  let d = dot(gradientAt(cell + vec2i(1, 1)), local - vec2f(1.0, 1.0));
  return mix(mix(a, b, blend.x), mix(c, d, blend.x), blend.y);
}

// A flow with no sources or sinks, so the dust swirls and never bunches up.
fn curlNoise(point: vec2f) -> vec2f {
  let step = 0.01;
  let value = gradientNoise(point);
  let dx = (gradientNoise(point + vec2f(step, 0.0)) - value) / step;
  let dy = (gradientNoise(point + vec2f(0.0, step)) - value) / step;
  return vec2f(dy, -dx);
}

// How near an extractor fan pulls at a page point: 0 at a fan's edge, 1 at
// its reach and beyond. A fan does not pull at its own dust.
fn fanGap(page: vec2f, emitter: u32) -> f32 {
  var gap = 1.0;
  for (var k = 0u; k < effectPage.elementCount; k += 1u) {
    let element = effectElements[k];
    let reach = dustElements[k].reach;
    if ((element.roles & EFFECT_ROLE_EXTRACTOR_FAN) != 0u && element.id != emitter && reach > 0.0) {
      gap = min(gap, max(effectElementDistance(element, page), 0.0) / reach);
    }
  }
  return gap;
}

fn spawn(elementIndex: u32, particleIndex: u32) -> DustParticle {
  var state = pcg(particleIndex ^ pcg(simulation.frame));
  let element = effectElements[elementIndex];
  // Of two points on the edge, shed from the one a fan pulls harder, so the
  // side that faces a fan sheds the most.
  var edge = randomEdgePoint(element, &state);
  let other = randomEdgePoint(element, &state);
  if (fanGap(other.position, element.id) < fanGap(edge.position, element.id)) {
    edge = other;
  }
  let tangent = vec2f(-edge.normal.y, edge.normal.x);
  let position = edge.position + edge.normal * (0.5 + random(&state) * 2.0);
  let speed = random(&state);
  let velocity = edge.normal * BIRTH_SPEED * (0.2 + 1.4 * speed * speed)
    + tangent * BIRTH_SPEED * (random(&state) - 0.5);
  return DustParticle(
    position,
    velocity,
    0.0,
    mix(LIFE_MIN, LIFE_MAX, random(&state)),
    random(&state),
    dustElements[elementIndex].color,
    element.id,
    mix(DRIFT_MIN, DRIFT_MAX, random(&state)),
    1.0,
  );
}

@compute @workgroup_size(${String(DUST_WORKGROUP_SIZE)})
fn simulate(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= simulation.liveCount) {
    return;
  }
  let index = (simulation.firstSlot + id.x) % arrayLength(&particles);
  let firstBorn = simulation.liveCount - simulation.bornCount;
  var particle = particles[index];
  if (id.x >= firstBorn) {
    particle = spawn(spawns[id.x - firstBorn], index);
  } else if (particle.age >= particle.life) {
    return;
  }

  let dt = effectPage.delta;
  let position = particle.position;
  let time = effectPage.seconds;
  let air = curlNoise(position / NOISE_SCALE + vec2f(time * 0.03, time * -0.02)) * DRIFT_SPEED
    + vec2f(0.0, -RISE_SPEED);

  var pull = vec2f(0.0);
  var intake = 1.0;
  var contactNormal = vec2f(0.0);
  var contactCenter = vec2f(0.0);
  var contactPush = 0.0;
  var contactDistance = OBSTACLE_RANGE;
  for (var k = 0u; k < effectPage.elementCount; k += 1u) {
    let element = effectElements[k];
    let isFan = (element.roles & EFFECT_ROLE_EXTRACTOR_FAN) != 0u && element.id != particle.emitter;
    let reach = dustElements[k].reach;
    let range = select(OBSTACLE_RANGE, max(reach, OBSTACLE_RANGE), isFan);
    let outside = max(abs(position - element.rect.xy - element.rect.zw * 0.5) - element.rect.zw * 0.5, vec2f(0.0));
    if (dot(outside, outside) > range * range) {
      continue;
    }
    let distance = effectElementDistance(element, position);
    if (distance > range) {
      continue;
    }
    let normal = elementNormal(element, position);
    if (isFan) {
      let falloff = 1.0 - smoothstep(reach * 0.55, reach, distance);
      let radius = reach * INTAKE_RADIUS;
      let speed = falloff * INTAKE_SPEED * radius / (max(distance, 0.0) + radius);
      pull -= (normal + vec2f(-normal.y, normal.x) * SWIRL) * speed;
      intake = min(intake, smoothstep(ABSORB_DISTANCE, INTAKE_FADE, distance));
    } else if (distance < contactDistance) {
      contactDistance = distance;
      contactNormal = normal;
      contactCenter = element.rect.xy + element.rect.zw * 0.5;
      // The element that shed a particle does not push it away, or its dust
      // would gather in a ring where the push ends.
      contactPush = select(OBSTACLE_PUSH, 0.0, element.id == particle.emitter);
    }
  }

  let entrained = smoothstep(particle.drift, particle.drift + ENTRAIN_SECONDS, particle.age);
  let coupling = mix(COUPLING_FLOATING, COUPLING_PULLED, entrained);
  var wanted = air + pull * entrained;
  let closeness = 1.0 - clamp(contactDistance / OBSTACLE_RANGE, 0.0, 1.0);
  // Air that heads into an obstacle turns along its edge instead, away from
  // the middle of the obstacle and more so the way it leans, so it parts
  // and flows round. Right at the parting point each particle picks a side.
  let inward = min(dot(wanted, contactNormal), 0.0) * closeness;
  let edge = vec2f(-contactNormal.y, contactNormal.x);
  let around = dot(position - contactCenter, edge) + dot(wanted, edge) * LEAN_SECONDS;
  let side = select(sign(around), select(-1.0, 1.0, particle.seed > 0.5), abs(around) < 0.5);
  wanted -= (edge * side + contactNormal) * inward;
  wanted += contactNormal * closeness * closeness * contactPush;
  var velocity = particle.velocity + (wanted - particle.velocity) * (1.0 - exp(-coupling * dt));
  let pointerSpeed = length(effectPage.pointerVelocity);
  if ((effectPage.pointerFlags & EFFECT_POINTER_PRESENT) != 0u && pointerSpeed > 0.0) {
    let offset = position - effectPage.pointerPosition;
    let near = exp(-dot(offset, offset) / (POINTER_RADIUS * POINTER_RADIUS))
      * min(1.0, pointerSpeed / POINTER_FULL_SPEED);
    velocity += (effectPage.pointerVelocity - velocity) * near * min(1.0, POINTER_DRAG * dt);
  }
  velocity -= contactNormal * min(dot(velocity, contactNormal), 0.0) * closeness * closeness;
  velocity += contactNormal * max(-contactDistance, 0.0) * OBSTACLE_ESCAPE;

  if (length(pull) * entrained > PULLED_SPEED) {
    particle.life = min(max(particle.life, particle.age + 1.0), MAX_LIFE);
  }
  particle.velocity = velocity;
  particle.position = position + velocity * dt;
  particle.age += dt;
  particle.intake = intake;
  let documentSize = effectPage.documentSize;
  let inDocument = all(particle.position > vec2f(-DOCUMENT_MARGIN))
    && all(particle.position < documentSize + DOCUMENT_MARGIN);
  if (intake <= 0.0 || !inDocument) {
    particle.life = particle.age;
  }
  particles[index] = particle;
}
`;
