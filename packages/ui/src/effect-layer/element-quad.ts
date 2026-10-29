import { d, tgpu } from "typegpu";
import { EffectElement } from "./page-layout.ts";
import { targetLayout } from "./target-layout.ts";

/**
 * The clip-space position of a page point on the target.
 *
 * @internal
 */
export const pageToClip = tgpu.fn(
  [d.vec2f],
  d.vec4f,
)((page) => {
  "use gpu";
  const target = targetLayout.$.effectTarget;
  const unit = page.sub(target.pageOffset).div(target.cssSize);
  return d.vec4f(unit.x * 2 - 1, 1 - unit.y * 2, 0, 1);
});

/**
 * The corner of a quad's triangle strip at `vertex`, from (0, 0) to (1, 1).
 *
 * @internal
 */
export const stripCorner = (vertex: number) => {
  "use gpu";
  return d.vec2f(d.f32(vertex & 1), d.f32((vertex >>> 1) & 1));
};

/**
 * The clip-space position of the corner at `vertex` of a quad over the
 * element's border box and `margin` CSS px round it, as a triangle strip.
 *
 * @internal
 */
export const elementQuad = tgpu.fn(
  [d.u32, EffectElement, d.f32],
  d.vec4f,
)((vertex, element, margin) => {
  "use gpu";
  return pageToClip(
    element.rect.xy
      .sub(margin)
      .add(stripCorner(vertex).mul(element.rect.zw.add(2 * margin))),
  );
});

/**
 * The input of a vertex function that draws one quad for each instance, and
 * what it passes on to its fragment function.
 *
 * @internal
 */
export const instancedQuadIn = {
  vertex: d.builtin.vertexIndex,
  instance: d.builtin.instanceIndex,
};
/** @internal */
export const instancedQuadVarying = {
  position: d.builtin.position,
  instance: d.interpolate("flat", d.u32),
};

/**
 * The page point of a fragment's `position.xy`.
 *
 * @internal
 */
export const fragmentToPage = tgpu.fn(
  [d.vec2f],
  d.vec2f,
)((fragment) => {
  "use gpu";
  const target = targetLayout.$.effectTarget;
  return target.pageOffset.add(fragment.div(target.pixelScale));
});
