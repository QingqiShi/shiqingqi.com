import { d, tgpu } from "typegpu";
import { MAX_BEAMS, MAX_LENSES } from "./scene-value.ts";
import { EFFECT_GROUP } from "./target-layout.ts";

/**
 * A Black hole, as `lens-from-box.ts` describes it, and the index of its
 * element in `effectElements`.
 *
 * @internal
 */
export const Lens = d.struct({
  center: d.vec2f,
  halfSize: d.vec2f,
  cornerRadius: d.f32,
  mass: d.f32,
  falloff: d.f32,
  element: d.u32,
});

/**
 * A Light beam: where it leaves, in which direction, in which colour, how
 * far it reaches and how far from its origin it starts to show, and the
 * index of its element in `effectElements`.
 *
 * @internal
 */
export const Beam = d.struct({
  origin: d.vec2f,
  direction: d.vec2f,
  color: d.vec3f,
  reach: d.f32,
  start: d.f32,
  element: d.u32,
});

/**
 * What one scope draws on one kind of target: its Black holes and its Light
 * beams, whether its page is dark, and `scope`, the index in `effectScopes`
 * of the scope of every beam and lens.
 *
 * @internal
 */
export const Scene = d.struct({
  lensCount: d.u32,
  beamCount: d.u32,
  dark: d.f32,
  scope: d.u32,
  lenses: d.arrayOf(Lens, MAX_LENSES),
  beams: d.arrayOf(Beam, MAX_BEAMS),
});

/**
 * The Black hole effect's own group: the scene to draw.
 *
 * @internal
 */
export const blackHoleLayout = tgpu
  .bindGroupLayout({
    scene: { uniform: Scene, visibility: ["fragment"] },
  })
  .$idx(EFFECT_GROUP);
