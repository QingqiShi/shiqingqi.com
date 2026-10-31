import { d, tgpu } from "typegpu";
import { MAX_PARTICLE_COUNT } from "./step-liquid.ts";
import { EFFECT_GROUP } from "./target-layout.ts";

/**
 * One particle of a body, in track space: rest radii from the origin, and
 * rest radii per second.
 *
 * @internal
 */
export const LiquidParticle = d.struct({
  position: d.vec2f,
  velocity: d.vec2f,
});

/**
 * What the liquid's simulation and its drawing share: a slot of the
 * simulation buffer, which holds one body's particles, the walls that held
 * them at the last step, and how far along the track they reach, from the
 * least x to the greatest. The simulation keeps each body's slot across
 * frames, and the drawing reads the particles from it.
 *
 * @internal
 */
export const LiquidSlot = d.struct({
  walls: d.vec2f,
  extent: d.vec2f,
  particles: d.arrayOf(LiquidParticle, MAX_PARTICLE_COUNT),
});

/**
 * One control's liquid on the GPU, as `LiquidInstanceRecord` describes it,
 * with its booleans as `flags`, and the corners as their radius and their
 * exponent, or zero for a pill.
 *
 * @internal
 */
export const LiquidInstance = d.struct({
  element: d.u32,
  slot: d.u32,
  particleCount: d.u32,
  firstBead: d.u32,
  beadCount: d.u32,
  flags: d.u32,
  radius: d.f32,
  calm: d.f32,
  origin: d.vec2f,
  body: d.f32,
  edgeLit: d.f32,
  thumb: d.vec3f,
  firm: d.f32,
  off: d.vec3f,
  rise: d.f32,
  on: d.vec3f,
  riseGoal: d.f32,
  backdrop: d.vec3f,
  spread: d.f32,
  restX: d.f32,
  span: d.f32,
  centre: d.vec2f,
  glint: d.f32,
  scale: d.f32,
  ringWidth: d.f32,
  edge: d.vec4f,
  ringOff: d.vec4f,
  ringOn: d.vec4f,
  corner: d.vec2f,
  leaving: d.vec3f,
});

/**
 * One bead on the track, in page coordinates and CSS px, or in the track's
 * frame on a vertical track, as `LiquidInstanceRecord` gives them.
 *
 * @internal
 */
export const LiquidBead = d.struct({ centre: d.vec2f, radius: d.f32 });

/**
 * The Liquid effect's own group: each control's liquid this frame, the
 * simulation buffer that holds the particles, and the beads.
 *
 * @internal
 */
export const liquidLayout = tgpu
  .bindGroupLayout({
    liquids: {
      storage: d.arrayOf(LiquidInstance),
      visibility: ["vertex", "fragment"],
    },
    slots: { storage: d.arrayOf(LiquidSlot), visibility: ["fragment"] },
    beads: { storage: d.arrayOf(LiquidBead), visibility: ["fragment"] },
  })
  .$idx(EFFECT_GROUP);

/**
 * One body's step on the GPU: the pill the liquid is pulled to, its goal
 * and its span, the aim across the track, the reach of the particles, the
 * walls the control gives, the step on the liquid's clock, and the slot of
 * the simulation buffer with the number of particles in it.
 *
 * @internal
 */
export const LiquidStep = d.struct({
  goal: d.f32,
  span: d.f32,
  aim: d.f32,
  scale: d.f32,
  walls: d.vec2f,
  seconds: d.f32,
  count: d.u32,
  slot: d.u32,
});

/**
 * The group of the simulation: the steps of this frame, and the simulation
 * buffer, one slot for each body.
 *
 * @internal
 */
export const liquidSimulationLayout = tgpu
  .bindGroupLayout({
    steps: { storage: d.arrayOf(LiquidStep), visibility: ["compute"] },
    slots: {
      storage: d.arrayOf(LiquidSlot),
      access: "mutable",
      visibility: ["compute"],
    },
  })
  .$idx(0);
