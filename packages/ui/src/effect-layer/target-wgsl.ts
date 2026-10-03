import { PAGE_WGSL } from "./page-wgsl.ts";

/**
 * The WGSL side of a render pipeline's bind groups: `PAGE_WGSL` in group 0,
 * and in group 1 the target being drawn, with helpers that map page
 * coordinates (CSS px from the top-left corner of the document) to it. Put it
 * at the start of an effect's render shader.
 *
 * @internal
 */
export const TARGET_WGSL = /* wgsl */ `${PAGE_WGSL}
struct EffectTarget {
  pageOffset: vec2f,
  cssSize: vec2f,
  pixelScale: vec2f,
  drawnPageRange: vec2f,
  seconds: f32,
}

@group(1) @binding(0) var<uniform> effectTarget: EffectTarget;

fn pageToClip(page: vec2f) -> vec4f {
  let unit = (page - effectTarget.pageOffset) / effectTarget.cssSize;
  return vec4f(unit.x * 2.0 - 1.0, 1.0 - unit.y * 2.0, 0.0, 1.0);
}

fn fragmentToPage(fragment: vec2f) -> vec2f {
  return effectTarget.pageOffset + fragment / effectTarget.pixelScale;
}
`;

/**
 * The byte size of the uniform buffer behind `TARGET_WGSL`.
 *
 * @internal
 */
export const TARGET_UNIFORM_BYTES = 48;

const targetUniform = new Float32Array(TARGET_UNIFORM_BYTES / 4);

/**
 * Packs the values of `TARGET_WGSL`'s `EffectTarget` in field order, into
 * one buffer that every call reuses. `GPUQueue.writeBuffer` copies it at once.
 *
 * @internal
 */
export function packTargetUniform(values: {
  pageOffset: readonly [number, number];
  cssSize: readonly [number, number];
  pixelScale: readonly [number, number];
  drawnPageRange: readonly [number, number];
  seconds: number;
}) {
  targetUniform.set(values.pageOffset, 0);
  targetUniform.set(values.cssSize, 2);
  targetUniform.set(values.pixelScale, 4);
  targetUniform.set(values.drawnPageRange, 6);
  targetUniform[8] = values.seconds;
  return targetUniform;
}
