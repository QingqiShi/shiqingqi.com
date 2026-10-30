import { d, tgpu } from "typegpu";
import { MAX_NEIGHBOURS, MAX_PULSES } from "./create-ripples.ts";
import { EFFECT_GROUP } from "./target-layout.ts";

/**
 * One element that draws rings this frame: a quad around it out to its
 * furthest crest, which sums its rings at each pixel, inside its Effect
 * container.
 *
 * - `extent` is how far the furthest crest is from the edge, in CSS px.
 * - `rings` holds, for each ring, the front, the amount, and the aim in the
 *   element's box space; `wakes` the strength of the wake behind it.
 * - `neighbours` holds the `effectElements` indices of the elements its
 *   rings fade against.
 *
 * @internal
 */
export const RippleInstance = d.struct({
  element: d.u32,
  ringCount: d.u32,
  neighbourCount: d.u32,
  extent: d.f32,
  alpha: d.f32,
  color: d.vec3f,
  wakes: d.arrayOf(d.f32, MAX_PULSES),
  neighbours: d.arrayOf(d.u32, MAX_NEIGHBOURS),
  rings: d.arrayOf(d.vec4f, MAX_PULSES),
});

/**
 * The Ripple effect's own group: each element that draws rings this frame.
 *
 * @internal
 */
export const rippleLayout = tgpu
  .bindGroupLayout({
    ripples: {
      storage: d.arrayOf(RippleInstance),
      visibility: ["vertex", "fragment"],
    },
  })
  .$idx(EFFECT_GROUP);
