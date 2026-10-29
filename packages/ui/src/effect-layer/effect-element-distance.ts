import { d, std, tgpu } from "typegpu";
import { EffectElement, pageLayout } from "./page-layout.ts";

/**
 * The elements of the scope at this index of `effectScopes` on the carrier
 * at this index of `EffectFrame.carriers`: the index of the first, and the
 * count.
 *
 * @internal
 */
export const effectRange = tgpu.fn(
  [d.u32, d.u32],
  d.vec2u,
)((scope, carrier) => {
  "use gpu";
  return pageLayout.$.effectRanges[
    scope * pageLayout.$.effectPage.carrierCount + carrier
  ];
});

/**
 * The signed distance from a page point to the element's border box: below
 * zero inside, zero on the edge. Exact on the edge; near a corner that is not
 * a circular arc, an estimate off it.
 *
 * @internal
 */
export const effectElementDistance = tgpu.fn(
  [EffectElement, d.vec2f],
  d.f32,
)((element, page) => {
  "use gpu";
  const halfSize = element.rect.zw.mul(0.5);
  const local = page.sub(element.rect.xy).sub(halfSize);
  const side = std.select(element.radii.xw, element.radii.yz, local.x > 0);
  const radius = std.select(side.x, side.y, local.y > 0);
  const inner = std.abs(local).sub(halfSize).add(radius);
  const outside = std.max(inner, d.vec2f(0));
  let corner = std.length(outside);
  if (radius > 0 && element.cornerExponent !== 2) {
    const n = element.cornerExponent;
    const unit = std.max(outside.div(radius), d.vec2f(1e-6));
    corner = std.pow(std.pow(unit.x, n) + std.pow(unit.y, n), 1 / n) * radius;
  }
  return std.min(std.max(inner.x, inner.y), 0) + corner - radius;
});

/**
 * The sRGB-encoded colour, premultiplied or not, as CSS
 * `filter: grayscale(amount)` draws it.
 *
 * @internal
 */
export const effectGrayscale = tgpu.fn(
  [d.vec3f, d.f32],
  d.vec3f,
)((rgb, amount) => {
  "use gpu";
  const luminance = std.dot(rgb, d.vec3f(0.2126, 0.7152, 0.0722));
  return std.mix(rgb, d.vec3f(luminance), amount);
});
