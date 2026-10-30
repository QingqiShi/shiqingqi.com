import { d, std, tgpu } from "typegpu";

/**
 * The greatest `u32`.
 *
 * @internal
 */
export const U32_MAX = 4_294_967_295;
/** The hash's `u32` range, mapped to [0, 1). */
const UNIT_PER_U32 = 1 / (U32_MAX + 1);

/**
 * The PCG hash of a `u32`.
 *
 * @internal
 */
export const pcg = tgpu.fn(
  [d.u32],
  d.u32,
)((value) => {
  "use gpu";
  const state = value * d.u32(747_796_405) + d.u32(2_891_336_453);
  const word = ((state >>> ((state >>> 28) + 4)) ^ state) * d.u32(277_803_737);
  return (word >>> 22) ^ word;
});

/**
 * The next random number from 0 to 1 of the sequence that `state` holds.
 *
 * @internal
 */
export const random = tgpu.fn(
  [d.ptrFn(d.u32)],
  d.f32,
)((state) => {
  "use gpu";
  state.$ = pcg(state.$);
  return d.f32(state.$) / d.f32(U32_MAX);
});

/**
 * pcg3d, from "Hash Functions for GPU Rendering" (Jarzynski and Olano,
 * 2020), from 0 to 1 on each axis.
 *
 * @internal
 */
export const hash3 = tgpu.fn(
  [d.vec2i],
  d.vec3f,
)((cell) => {
  "use gpu";
  const value = d
    .vec3u(std.bitcast(d.vec2i, d.vec2u)(cell), d.u32(0x9e_37_79_b9))
    .mul(1_664_525)
    .add(1_013_904_223);
  value.x += value.y * value.z;
  value.y += value.z * value.x;
  value.z += value.x * value.y;
  value.x ^= value.x >>> 16;
  value.y ^= value.y >>> 16;
  value.z ^= value.z >>> 16;
  value.x += value.y * value.z;
  value.y += value.z * value.x;
  value.z += value.x * value.y;
  return d.vec3f(value).mul(UNIT_PER_U32);
});
