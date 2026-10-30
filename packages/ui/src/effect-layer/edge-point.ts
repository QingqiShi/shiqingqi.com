import { d, std, tgpu } from "typegpu";
import { effectElementDistance } from "./effect-element-distance.ts";
import { EffectElement } from "./page-layout.ts";
import { random } from "./pcg.ts";

/**
 * The outward normal of an element's edge nearest a page point.
 *
 * @internal
 */
export const elementNormal = tgpu.fn(
  [EffectElement, d.vec2f],
  d.vec2f,
)((element, page) => {
  "use gpu";
  const step = d.vec2f(0.5, 0);
  const gradient = d.vec2f(
    effectElementDistance(element, page.add(step.xy)) -
      effectElementDistance(element, page.sub(step.xy)),
    effectElementDistance(element, page.add(step.yx)) -
      effectElementDistance(element, page.sub(step.yx)),
  );
  const size = std.length(gradient);
  return std.select(d.vec2f(0, -1), gradient.div(size), size > 1e-5);
});

/**
 * A point on an element's edge, and the edge's outward normal there.
 *
 * @internal
 */
export const EdgePoint = d.struct({
  position: d.vec2f,
  normal: d.vec2f,
});

/**
 * The point `portion` of the way round an element's edge, clockwise from
 * the top-left corner.
 *
 * @internal
 */
export const edgePoint = tgpu.fn(
  [EffectElement, d.f32],
  EdgePoint,
)((element, portion) => {
  "use gpu";
  const size = element.rect.zw;
  const perimeter = 2 * (size.x + size.y);
  const along = portion * perimeter;
  let offset = d.vec2f(0, perimeter - along);
  if (along < size.x) {
    offset = d.vec2f(along, 0);
  } else if (along < size.x + size.y) {
    offset = d.vec2f(size.x, along - size.x);
  } else if (along < 2 * size.x + size.y) {
    offset = d.vec2f(2 * size.x + size.y - along, size.y);
  }
  const corner = element.rect.xy.add(offset);
  const normal = elementNormal(element, corner);
  return EdgePoint({
    position: corner.sub(normal.mul(effectElementDistance(element, corner))),
    normal,
  });
});

/**
 * A random point on an element's edge, each length of edge as likely as any
 * other.
 *
 * @internal
 */
export const randomEdgePoint = tgpu.fn(
  [EffectElement, d.ptrFn(d.u32)],
  EdgePoint,
)((element, state) => {
  "use gpu";
  return edgePoint(element, random(state));
});
