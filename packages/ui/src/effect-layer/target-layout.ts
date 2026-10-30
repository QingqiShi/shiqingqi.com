import { d, tgpu } from "typegpu";

/**
 * The target that a render pass draws: the part of one `<canvas>` element
 * that `EffectTarget` describes on the JavaScript side.
 *
 * @internal
 */
export const EffectTarget = d.struct({
  pageOffset: d.vec2f,
  cssSize: d.vec2f,
  pixelScale: d.vec2f,
  drawnPageRange: d.vec2f,
  seconds: d.f32,
});

/**
 * Group 1 of every render pipeline: the target being drawn.
 *
 * @internal
 */
export const targetLayout = tgpu
  .bindGroupLayout({
    effectTarget: { uniform: EffectTarget, visibility: ["vertex", "fragment"] },
  })
  .$idx(1);

/**
 * The index of an effect's own group in its render pipelines, after
 * `pageLayout` (0) and `targetLayout` (1). An effect's layout takes it
 * with `.$idx(EFFECT_GROUP)`.
 *
 * @internal
 */
export const EFFECT_GROUP = 2;
