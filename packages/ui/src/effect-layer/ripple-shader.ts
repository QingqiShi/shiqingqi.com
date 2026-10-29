import { d, std, tgpu } from "typegpu";
import { ABSORB_DISTANCE } from "./create-ripples.ts";
import { effectClip } from "./effect-clip.ts";
import {
  effectElementDistance,
  effectGrayscale,
} from "./effect-element-distance.ts";
import {
  elementQuad,
  fragmentToPage,
  instancedQuadIn,
  instancedQuadVarying,
} from "./element-quad.ts";
import { pageLayout } from "./page-layout.ts";
import { rippleLayout } from "./ripple-layout.ts";

const EDGE_OVERLAP = 1.5;
/** Below this alpha, a pixel shows nothing. */
const MIN_ALPHA = 1 / 512;

const crestWidth = (front: number) => {
  "use gpu";
  return 1.25 + front * 0.03;
};

/**
 * How much of a ring shows at `offset` from its front: a crest with a crisp
 * leading edge and a softer trailing side, over an even wake of colour back
 * to the element.
 */
const ringProfile = (offset: number, front: number, wake: number) => {
  "use gpu";
  const width = crestWidth(front);
  if (offset >= 0) {
    const x = offset / width;
    return std.exp(-x * x);
  }
  const x = offset / (width * 2.5);
  return std.max(std.exp(-x * x), wake);
};

/** The quad of one instance, corner by corner as a triangle strip. */
const rippleVertex = tgpu.vertexFn({
  in: instancedQuadIn,
  out: instancedQuadVarying,
})((input) => {
  "use gpu";
  const ripple = rippleLayout.$.ripples[input.instance];
  const element = pageLayout.$.effectElements[ripple.element];
  const margin = ripple.extent + 2 * crestWidth(ripple.extent);
  return {
    position: elementQuad(input.vertex, element, margin),
    instance: input.instance,
  };
});

/** The rings of one instance at a pixel. */
const rippleFragment = tgpu.fragmentFn({
  in: instancedQuadVarying,
  out: d.vec4f,
})((input) => {
  "use gpu";
  const ripple = rippleLayout.$.ripples[input.instance];
  const element = pageLayout.$.effectElements[ripple.element];
  const page = fragmentToPage(input.position.xy);
  const edge = effectElementDistance(element, page);
  // The rings start just inside the edge and cover the element's own
  // anti-aliased edge, so that no line of page shows between them.
  if (edge <= -EDGE_OVERLAP) {
    return d.vec4f(0);
  }
  const halfSize = std.max(element.rect.zw.mul(0.5), d.vec2f(1));
  const local = page.sub(element.rect.xy).sub(halfSize).div(halfSize);
  const direction = local.div(std.max(std.length(local), 1e-4));

  let clear = d.f32(1);
  for (let i = d.u32(0); i < ripple.ringCount; i += 1) {
    const ring = ripple.rings[i];
    const aim = (1 + std.dot(direction, ring.zw)) / (1 + std.length(ring.zw));
    clear *=
      1 -
      std.saturate(
        ring.y * aim * ringProfile(edge - ring.x, ring.x, ripple.wakes[i]),
      );
  }
  let alpha =
    (1 - clear) * ripple.alpha * std.smoothstep(-EDGE_OVERLAP, 0, edge);
  if (alpha < MIN_ALPHA) {
    return d.vec4f(0);
  }
  alpha *= effectClip(element.scope, page);
  for (let n = d.u32(0); n < ripple.neighbourCount; n += 1) {
    const other = pageLayout.$.effectElements[ripple.neighbours[n]];
    alpha *= std.smoothstep(
      0,
      ABSORB_DISTANCE,
      effectElementDistance(other, page),
    );
  }
  return d.vec4f(
    effectGrayscale(ripple.color, element.grayscale).mul(alpha),
    alpha,
  );
});

/**
 * The render shader of the Ripple effect, for `createInstancedDraw`: one
 * quad for each entry of `ripples`.
 *
 * @internal
 */
export const rippleShader = {
  vertex: rippleVertex,
  fragment: rippleFragment,
};
