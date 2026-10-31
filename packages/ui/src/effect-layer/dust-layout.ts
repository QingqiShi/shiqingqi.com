import { d, tgpu } from "typegpu";
import {
  DUST_MAX_SPAWNS_PER_FRAME,
  DUST_PARTICLE_BUDGET,
} from "./schedule-dust-spawns.ts";
import { EFFECT_GROUP } from "./target-layout.ts";

/**
 * One dust particle, which lives on the GPU only.
 *
 * - `seed` is from 0 to 1, fixed at birth: its size and its flicker.
 * - `color` is sRGB-encoded, alpha its opacity, as `unpack4x8unorm` reads it.
 * - `emitter` is the id of the element that shed it, so that element does
 *   not pull it in.
 * - `drift` is the seconds it floats before the extractor fans pull it.
 * - `intake` is 1 far from an extractor fan, falling to 0 at its edge.
 * - `scope` is the id of the scope of the element that shed it, and
 *   `scopeIndex` the index of that scope in `effectScopes` this frame.
 * - `dark` is 1 when it draws over a dark backdrop, fixed at birth like its
 *   colour.
 * - `grayscale` is the grayscale of the element that shed it, which each
 *   frame reads again.
 * - `flags` holds `DUST_ON_VIEWPORT` and `DUST_BURST`, fixed at birth.
 *
 * @internal
 */
export const DustParticle = d.struct({
  position: d.vec2f,
  velocity: d.vec2f,
  age: d.f32,
  life: d.f32,
  seed: d.f32,
  color: d.u32,
  emitter: d.u32,
  drift: d.f32,
  intake: d.f32,
  scope: d.u32,
  scopeIndex: d.u32,
  dark: d.u32,
  grayscale: d.f32,
  flags: d.u32,
});

/**
 * The bit of `DustParticle.flags` for a particle whose position is in
 * viewport coordinates, so it keeps its place on the screen while the page
 * scrolls.
 *
 * @internal
 */
export const DUST_ON_VIEWPORT = 1;
/**
 * The bit of `DustParticle.flags` for a particle that a burst shed.
 *
 * @internal
 */
export const DUST_BURST = 2;

/**
 * What the Dust effect adds to each entry of `effectElements`, at the same
 * index of `dustElements`.
 *
 * - `color` is the colour of the dust it sheds, packed like
 *   `DustParticle.color`.
 * - `reach` is how far from its edge an extractor fan pulls, in CSS px.
 * - `dark` is 1 when what its scope draws over is dark.
 * - `onViewport` is 1 when the dust it sheds stays on the viewport.
 *
 * @internal
 */
export const DustElement = d.struct({
  color: d.u32,
  reach: d.f32,
  dark: d.u32,
  onViewport: d.u32,
});

/**
 * The Dust effect's own group in its render pipelines: every particle, and
 * the Dust effect's values for each element.
 *
 * @internal
 */
export const dustLayout = tgpu
  .bindGroupLayout({
    particles: {
      storage: d.arrayOf(DustParticle, DUST_PARTICLE_BUDGET),
      visibility: ["vertex"],
    },
    dustElements: { storage: d.arrayOf(DustElement), visibility: ["vertex"] },
  })
  .$idx(EFFECT_GROUP);

/**
 * The index in `effectElements` of the element that sheds one particle of
 * this frame.
 *
 * @internal
 */
export const DustSpawn = d.u32;

/**
 * The slots that can hold a live particle, from `firstSlot` on round the
 * ring; the last `bornCount` of them are shed this frame.
 *
 * @internal
 */
export const DustSimulation = d.struct({
  firstSlot: d.u32,
  liveCount: d.u32,
  bornCount: d.u32,
  frame: d.u32,
});

/**
 * Group 1 of the simulation, after `pageLayout`: the slots to step, every
 * particle, the index in `effectElements` of the element that sheds each
 * particle of this frame, and the Dust effect's values for each element.
 *
 * @internal
 */
export const dustSimulationLayout = tgpu
  .bindGroupLayout({
    simulation: { uniform: DustSimulation, visibility: ["compute"] },
    particles: {
      storage: d.arrayOf(DustParticle, DUST_PARTICLE_BUDGET),
      access: "mutable",
      visibility: ["compute"],
    },
    spawns: {
      storage: d.arrayOf(DustSpawn, DUST_MAX_SPAWNS_PER_FRAME),
      visibility: ["compute"],
    },
    dustElements: { storage: d.arrayOf(DustElement), visibility: ["compute"] },
  })
  .$idx(1);
