import { d, tgpu } from "typegpu";
import { PROFILE_LENGTH, STONE_SLOTS } from "./pond.ts";
import { EFFECT_GROUP } from "./target-layout.ts";

/**
 * One stone in a pond: where it landed, in the element's own px, and the
 * first `count` entries of the slope of its rings, outward from `origin`,
 * at each `PROFILE_STEP` of distance: the same slope that bends the
 * element's content in the frame that shows.
 *
 * @internal
 */
export const PondStone = d.struct({
  origin: d.vec2f,
  count: d.u32,
  profile: d.arrayOf(d.f32, PROFILE_LENGTH),
});

/**
 * One element whose water shows rings this frame: a quad over it, which
 * lights the water at each pixel inside it.
 *
 * - `size` is the size of the element, in its own px, before a transform
 *   scales it.
 * - The height of the water is the sum of the rings of the first
 *   `stoneCount` entries of `stones`.
 * - `glint` and `shade` are how much the slopes that face the light and
 *   face away from it show on the element's fill.
 *
 * @internal
 */
export const PondInstance = d.struct({
  element: d.u32,
  stoneCount: d.u32,
  glint: d.f32,
  shade: d.f32,
  size: d.vec2f,
  stones: d.arrayOf(PondStone, STONE_SLOTS),
});

/**
 * The Pond effect's own group: each element whose water shows rings this
 * frame.
 *
 * @internal
 */
export const pondLayout = tgpu
  .bindGroupLayout({
    ponds: {
      storage: d.arrayOf(PondInstance),
      visibility: ["vertex", "fragment"],
    },
  })
  .$idx(EFFECT_GROUP);
