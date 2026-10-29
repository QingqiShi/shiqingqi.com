import { d, tgpu } from "typegpu";
import { EFFECT_GROUP } from "./target-layout.ts";

/**
 * One element with a ring light this frame: a quad around it out to the
 * reach of the light, which lights the outline where the comet is.
 *
 * - `comet` is the head as a share of the outline, the direction, the
 *   strength, and the tail as a share of the outline. A strength of 0 draws
 *   no comet.
 *
 * @internal
 */
export const RingLightInstance = d.struct({
  element: d.u32,
  even: d.f32,
  alpha: d.f32,
  pageTint: d.f32,
  core: d.vec4f,
  tint: d.vec4f,
  bloom: d.vec4f,
  comet: d.vec4f,
});

/**
 * The Ring light effect's own group: each element with a ring light this
 * frame.
 *
 * @internal
 */
export const ringLightLayout = tgpu
  .bindGroupLayout({
    ringLights: {
      storage: d.arrayOf(RingLightInstance),
      visibility: ["vertex", "fragment"],
    },
  })
  .$idx(EFFECT_GROUP);
