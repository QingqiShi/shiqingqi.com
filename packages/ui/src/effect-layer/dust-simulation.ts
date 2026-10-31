import { d, std, tgpu } from "typegpu";
import { DUST_WORKGROUP_SIZE, EXTRACTOR_FAN } from "./dust-element-value.ts";
import {
  DUST_BURST,
  DUST_ON_VIEWPORT,
  DustParticle,
  dustSimulationLayout,
} from "./dust-layout.ts";
import { dustPagePosition } from "./dust-page-position.ts";
import { EdgePoint, elementNormal, randomEdgePoint } from "./edge-point.ts";
import {
  effectElementDistance,
  effectRange,
} from "./effect-element-distance.ts";
import { NO_INDEX, POINTER_PRESENT } from "./effect-page-value.ts";
import { pageLayout } from "./page-layout.ts";
import { pcg, random, U32_MAX } from "./pcg.ts";
import {
  DUST_BURST_SPAWN,
  DUST_MAX_LIFE,
  DUST_PARTICLE_BUDGET,
} from "./schedule-dust-spawns.ts";

// CSS px per second, or seconds.
const BIRTH_SPEED = 26;
const LIFE_MIN = 4;
const LIFE_MAX = 7;
const DRIFT_MIN = 0.6;
const DRIFT_MAX = 1.8;
const ENTRAIN_SECONDS = 1.4;
const BURST_SPEED = 170;
const BURST_LIFE_MIN = 1.4;
const BURST_LIFE_MAX = 2.4;
const BURST_ENTRAIN_SECONDS = 0.3;
/** How fast a burst particle slows to the speed of the air, per second. */
const COUPLING_BURST = 3.5;
/** How much faster a fan pulls a burst particle in. */
const BURST_PULL = 1.8;
const NOISE_SCALE = 220;
const DRIFT_SPEED = 20;
const RISE_SPEED = 3;
/**
 * How fast a particle takes on the speed of the air around it, per second:
 * loosely while it floats, closely once a fan pulls it.
 */
const COUPLING_FLOATING = 1.2;
const COUPLING_PULLED = 6;
/**
 * The sink flow: `INTAKE_SPEED` at the fan's edge, and half that at a share
 * `INTAKE_RADIUS` of its reach out.
 */
const INTAKE_SPEED = 620;
const INTAKE_RADIUS = 0.4;
const INTAKE_FADE = 12;
/** How far the air turns aside as it goes in, as a share of its speed. */
const SWIRL = 0.12;
const ABSORB_DISTANCE = 1;
/**
 * The air parts around an obstacle within `OBSTACLE_RANGE` of its edge, so
 * dust flows round it with some room to spare.
 */
const OBSTACLE_RANGE = 28;
const OBSTACLE_PUSH = 30;
/**
 * How far the parting point moves with air that leans along the edge, as the
 * seconds the air takes to get there.
 */
const LEAN_SECONDS = 0.15;
/** Per second, for each CSS px a particle is inside an obstacle. */
const OBSTACLE_ESCAPE = 9;
const POINTER_RADIUS = 90;
const POINTER_DRAG = 3.5;
const POINTER_FULL_SPEED = 150;
const DOCUMENT_MARGIN = 64;
/** A particle that a fan pulls faster than this lives until it gets there. */
const PULLED_SPEED = 20;
const CURL_STEP = 0.01;
const RADIANS_PER_HASH = 6.283_185_3 / U32_MAX;

const gradientAt = tgpu.fn(
  [d.vec2i],
  d.vec2f,
)((cell) => {
  "use gpu";
  const bits = std.bitcast(d.vec2i, d.vec2u)(cell);
  const hash = pcg(bits.x ^ pcg(bits.y));
  const angle = d.f32(hash) * RADIANS_PER_HASH;
  return d.vec2f(std.cos(angle), std.sin(angle));
});

const gradientNoise = tgpu.fn(
  [d.vec2f],
  d.f32,
)((point) => {
  "use gpu";
  const cell = d.vec2i(std.floor(point));
  const local = std.fract(point);
  const blend = local.mul(local).mul(d.vec2f(3).sub(local.mul(2)));
  const topLeft = std.dot(gradientAt(cell), local);
  const topRight = std.dot(
    gradientAt(cell.add(d.vec2i(1, 0))),
    local.sub(d.vec2f(1, 0)),
  );
  const bottomLeft = std.dot(
    gradientAt(cell.add(d.vec2i(0, 1))),
    local.sub(d.vec2f(0, 1)),
  );
  const bottomRight = std.dot(
    gradientAt(cell.add(d.vec2i(1, 1))),
    local.sub(d.vec2f(1, 1)),
  );
  return std.mix(
    std.mix(topLeft, topRight, blend.x),
    std.mix(bottomLeft, bottomRight, blend.x),
    blend.y,
  );
});

/** A flow with no sources or sinks, so the dust swirls and never bunches up. */
const curlNoise = tgpu.fn(
  [d.vec2f],
  d.vec2f,
)((point) => {
  "use gpu";
  const value = gradientNoise(point);
  const dx =
    (gradientNoise(point.add(d.vec2f(CURL_STEP, 0))) - value) / CURL_STEP;
  const dy =
    (gradientNoise(point.add(d.vec2f(0, CURL_STEP))) - value) / CURL_STEP;
  return d.vec2f(dy, -dx);
});

/**
 * How near an extractor fan of the scope at this index of `effectScopes`
 * pulls at a page point: 0 at a fan's edge, 1 at its reach and beyond. A fan
 * does not pull at its own dust.
 */
const fanGap = tgpu.fn(
  [d.vec2f, d.u32, d.u32],
  d.f32,
)((page, emitter, scope) => {
  "use gpu";
  let gap = d.f32(1);
  for (
    let carrier = d.u32(0);
    carrier < pageLayout.$.effectPage.carrierCount;
    carrier += 1
  ) {
    const span = effectRange(scope, carrier);
    for (let k = span.x; k < span.x + span.y; k += 1) {
      const element = pageLayout.$.effectElements[k];
      const reach = dustSimulationLayout.$.dustElements[k].reach;
      if (
        (element.roles & EXTRACTOR_FAN) !== 0 &&
        element.id !== emitter &&
        reach > 0
      ) {
        gap = std.min(
          gap,
          std.max(effectElementDistance(element, page), 0) / reach,
        );
      }
    }
  }
  return gap;
});

/** The index in `effectScopes` of the scope with this id, or `NO_INDEX`. */
const scopeIndexOf = tgpu.fn(
  [d.u32],
  d.u32,
)((id) => {
  "use gpu";
  for (
    let index = d.u32(0);
    index < pageLayout.$.effectPage.scopeCount;
    index += 1
  ) {
    if (pageLayout.$.effectScopes[index].id === id) {
      return index;
    }
  }
  return d.u32(NO_INDEX);
});

const spawn = tgpu.fn(
  [d.u32, d.u32],
  DustParticle,
)((entry, particleIndex) => {
  "use gpu";
  const state = d.ref(
    pcg(particleIndex ^ pcg(dustSimulationLayout.$.simulation.frame)),
  );
  const elementIndex = entry & d.u32(DUST_BURST_SPAWN - 1);
  const isBurst = (entry & d.u32(DUST_BURST_SPAWN)) !== 0;
  const element = pageLayout.$.effectElements[elementIndex];
  const scope = element.scope;
  // Of two points on the edge, shed from the one a fan pulls harder, so the
  // side that faces a fan sheds the most.
  let edge = randomEdgePoint(element, state);
  const other = randomEdgePoint(element, state);
  if (
    fanGap(other.position, element.id, scope) <
    fanGap(edge.position, element.id, scope)
  ) {
    edge = EdgePoint(other);
  }
  const tangent = d.vec2f(-edge.normal.y, edge.normal.x);
  let position = edge.position.add(edge.normal.mul(0.5 + random(state) * 2));
  const speed = random(state);
  const birthSpeed = std.select(
    d.f32(BIRTH_SPEED),
    d.f32(BURST_SPEED),
    isBurst,
  );
  const velocity = edge.normal
    .mul(birthSpeed)
    .mul(0.2 + 1.4 * speed * speed)
    .add(tangent.mul(birthSpeed).mul(random(state) - 0.5));
  const life = std.select(
    std.mix(d.f32(LIFE_MIN), d.f32(LIFE_MAX), random(state)),
    std.mix(d.f32(BURST_LIFE_MIN), d.f32(BURST_LIFE_MAX), random(state)),
    isBurst,
  );
  const seed = random(state);
  const drift = std.select(
    std.mix(d.f32(DRIFT_MIN), d.f32(DRIFT_MAX), random(state)),
    d.f32(0),
    isBurst,
  );
  let flags = std.select(d.u32(0), d.u32(DUST_BURST), isBurst);
  const dust = dustSimulationLayout.$.dustElements[elementIndex];
  if (dust.onViewport !== 0) {
    flags |= DUST_ON_VIEWPORT;
    position = position.sub(pageLayout.$.effectPage.viewport.xy);
  }
  return DustParticle({
    position,
    velocity,
    age: 0,
    life,
    seed,
    color: dust.color,
    emitter: element.id,
    drift,
    intake: 1,
    scope: pageLayout.$.effectScopes[scope].id,
    scopeIndex: scope,
    dark: dust.dark,
    grayscale: element.grayscale,
    flags,
  });
});

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
 * - A particle of a burst flies off the edge fast and slows down soon, the
 *   fans take it at once and pull it in faster, and it dies sooner.
 * - A particle of an element whose dust is on the viewport moves in
 *   viewport coordinates, so a scroll does not move it on the screen. It meets the elements at its
 *   page position, and the air's noise stays with the screen.
 * - Every other registered element is an obstacle that it slides around,
 *   and so is its own element unless it is a particle of a burst.
 * - A moving pointer drags the air near it.
 * - Only the elements of the particle's own scope act on it. In an Effect
 *   container's scope it dies once it leaves the container's border box,
 *   and when the container is gone. Each frame it takes the index of its
 *   scope in `effectScopes`, for the drawing to clip to.
 *
 * @internal
 */
export const dustSimulation = tgpu.computeFn({
  in: { id: d.builtin.globalInvocationId },
  workgroupSize: [DUST_WORKGROUP_SIZE],
})((input) => {
  "use gpu";
  const slots = dustSimulationLayout.$.simulation;
  const slot = input.id.x;
  if (slot >= slots.liveCount) {
    return;
  }
  const index = (slots.firstSlot + slot) % DUST_PARTICLE_BUDGET;
  const firstBorn = slots.liveCount - slots.bornCount;
  let particle = DustParticle(dustSimulationLayout.$.particles[index]);
  if (slot >= firstBorn) {
    particle = spawn(dustSimulationLayout.$.spawns[slot - firstBorn], index);
  } else if (particle.age >= particle.life) {
    return;
  }

  const page = pageLayout.$.effectPage;
  const dt = page.delta;
  const isBurst = (particle.flags & DUST_BURST) !== 0;
  const position = dustPagePosition(particle);
  const time = page.seconds;
  const air = curlNoise(
    particle.position.div(NOISE_SCALE).add(d.vec2f(time * 0.03, time * -0.02)),
  )
    .mul(DRIFT_SPEED)
    .add(d.vec2f(0, -RISE_SPEED));

  let pull = d.vec2f(0);
  let intake = d.f32(1);
  let contactNormal = d.vec2f(0);
  let contactCenter = d.vec2f(0);
  let contactPush = d.f32(0);
  let contactDistance = d.f32(OBSTACLE_RANGE);
  const scope = scopeIndexOf(particle.scope);
  if (scope === NO_INDEX) {
    particle.life = particle.age;
    dustSimulationLayout.$.particles[index] = DustParticle(particle);
    return;
  }
  const container = pageLayout.$.effectScopes[scope].container;
  const inScope =
    container === NO_INDEX ||
    effectElementDistance(pageLayout.$.effectElements[container], position) < 0;
  for (let carrier = d.u32(0); carrier < page.carrierCount; carrier += 1) {
    const span = effectRange(scope, carrier);
    for (let k = span.x; k < span.x + span.y; k += 1) {
      const element = pageLayout.$.effectElements[k];
      if (element.id === particle.emitter) {
        particle.grayscale = element.grayscale;
      }
      const isFan =
        (element.roles & EXTRACTOR_FAN) !== 0 &&
        element.id !== particle.emitter;
      const reach = dustSimulationLayout.$.dustElements[k].reach;
      const range = std.select(
        d.f32(OBSTACLE_RANGE),
        std.max(reach, OBSTACLE_RANGE),
        isFan,
      );
      const outside = std.max(
        std
          .abs(position.sub(element.rect.xy).sub(element.rect.zw.mul(0.5)))
          .sub(element.rect.zw.mul(0.5)),
        d.vec2f(0),
      );
      if (std.dot(outside, outside) > range * range) {
        continue;
      }
      const distance = effectElementDistance(element, position);
      if (distance > range) {
        continue;
      }
      const normal = elementNormal(element, position);
      if (isFan) {
        const falloff = 1 - std.smoothstep(reach * 0.55, reach, distance);
        const radius = reach * INTAKE_RADIUS;
        const speed =
          (falloff * INTAKE_SPEED * radius) / (std.max(distance, 0) + radius);
        pull = pull.sub(
          normal.add(d.vec2f(-normal.y, normal.x).mul(SWIRL)).mul(speed),
        );
        intake = std.min(
          intake,
          std.smoothstep(ABSORB_DISTANCE, INTAKE_FADE, distance),
        );
      } else if (
        distance < contactDistance &&
        !(isBurst && element.id === particle.emitter)
      ) {
        contactDistance = distance;
        contactNormal = d.vec2f(normal);
        contactCenter = element.rect.xy.add(element.rect.zw.mul(0.5));
        // The element that shed a particle does not push it away, or its dust
        // would gather in a ring where the push ends.
        contactPush = std.select(
          d.f32(OBSTACLE_PUSH),
          d.f32(0),
          element.id === particle.emitter,
        );
      }
    }
  }

  const entrainSeconds = std.select(
    d.f32(ENTRAIN_SECONDS),
    d.f32(BURST_ENTRAIN_SECONDS),
    isBurst,
  );
  const entrained = std.smoothstep(
    particle.drift,
    particle.drift + entrainSeconds,
    particle.age,
  );
  const coupling = std.mix(
    std.select(d.f32(COUPLING_FLOATING), d.f32(COUPLING_BURST), isBurst),
    d.f32(COUPLING_PULLED),
    entrained,
  );
  let wanted = air.add(
    pull.mul(entrained).mul(std.select(d.f32(1), d.f32(BURST_PULL), isBurst)),
  );
  const closeness = 1 - std.clamp(contactDistance / OBSTACLE_RANGE, 0, 1);
  // Air that heads into an obstacle turns along its edge instead, away from
  // the middle of the obstacle and more so the way it leans, so it parts
  // and flows round. Right at the parting point each particle picks a side.
  const inward = std.min(std.dot(wanted, contactNormal), 0) * closeness;
  const edge = d.vec2f(-contactNormal.y, contactNormal.x);
  const around =
    std.dot(position.sub(contactCenter), edge) +
    std.dot(wanted, edge) * LEAN_SECONDS;
  const side = std.select(
    std.sign(around),
    std.select(d.f32(-1), d.f32(1), particle.seed > 0.5),
    std.abs(around) < 0.5,
  );
  wanted = wanted.sub(edge.mul(side).add(contactNormal).mul(inward));
  wanted = wanted.add(
    contactNormal.mul(closeness).mul(closeness).mul(contactPush),
  );
  let velocity = particle.velocity.add(
    wanted.sub(particle.velocity).mul(1 - std.exp(-coupling * dt)),
  );
  const pointerSpeed = std.length(page.pointerVelocity);
  if ((page.pointerFlags & POINTER_PRESENT) !== 0 && pointerSpeed > 0) {
    const offset = position.sub(page.pointerPosition);
    const near =
      std.exp(-std.dot(offset, offset) / (POINTER_RADIUS * POINTER_RADIUS)) *
      std.min(1, pointerSpeed / POINTER_FULL_SPEED);
    velocity = velocity.add(
      page.pointerVelocity
        .sub(velocity)
        .mul(near * std.min(1, POINTER_DRAG * dt)),
    );
  }
  velocity = velocity.sub(
    contactNormal
      .mul(std.min(std.dot(velocity, contactNormal), 0))
      .mul(closeness)
      .mul(closeness),
  );
  velocity = velocity.add(
    contactNormal.mul(std.max(-contactDistance, 0)).mul(OBSTACLE_ESCAPE),
  );

  if (std.length(pull) * entrained > PULLED_SPEED) {
    particle.life = std.min(
      std.max(particle.life, particle.age + 1),
      DUST_MAX_LIFE,
    );
  }
  particle.velocity = d.vec2f(velocity);
  particle.position = particle.position.add(velocity.mul(dt));
  particle.age += dt;
  particle.intake = intake;
  particle.scopeIndex = scope;
  const pagePosition = dustPagePosition(particle);
  const inDocument =
    std.all(std.gt(pagePosition, d.vec2f(-DOCUMENT_MARGIN))) &&
    std.all(std.lt(pagePosition, page.documentSize.add(DOCUMENT_MARGIN)));
  if (intake <= 0 || !inDocument || !inScope) {
    particle.life = particle.age;
  }
  dustSimulationLayout.$.particles[index] = DustParticle(particle);
});
