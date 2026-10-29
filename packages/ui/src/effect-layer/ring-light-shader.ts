import { d, std, tgpu } from "typegpu";
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
import { cornerRadius, outlineLength, outlineParam } from "./outline-param.ts";
import { pageLayout } from "./page-layout.ts";
import { ringLightLayout } from "./ring-light-layout.ts";
import { targetLayout } from "./target-layout.ts";

/** The half width of a comet's core at its head, in CSS px. */
const CORE_HALF_WIDTH = 1.8;
/** The core's width at the end of the tail, against its width at the head. */
const TAIL_WIDTH = 0.35;
/** How far the light runs ahead of a comet's head, and behind it. */
const FRONT_LENGTH = 3;
const HEAD_LENGTH = 18;
/** The tail's brightness against the head's. */
const TAIL_GAIN = 0.95;
/** How far the tail goes from the core's colour towards the tint. */
const TAIL_TINT = 0.5;
/** The width of the bloom round the core, in CSS px. */
const BLOOM_SIGMA = 3.5;
/** Below this, a pixel shows nothing. */
const MIN_LIGHT = 1 / 512;

/**
 * Where the core runs, in CSS px inside the edge. A surface such as Glass
 * blurs what is under it, so the core runs just outside the edge, where the
 * blur cannot reach.
 */
const INSET = -0.9;

/** How far from the edge the core and its bloom reach, in CSS px. */
const RIM_REACH = 1 + CORE_HALF_WIDTH + 3 * BLOOM_SIGMA;

/**
 * How much of a pixel a line of half width `half` covers, at `across` from
 * its middle, anti-aliased over one pixel. A line thinner than a pixel dims
 * instead.
 */
const band = (across: number, half: number, pixel: number) => {
  "use gpu";
  const wide = std.max(half, 0.5 * pixel);
  return (std.saturate((wide - std.abs(across)) / pixel + 0.5) * half) / wide;
};

/** The quad of one instance, corner by corner as a triangle strip. */
const ringLightVertex = tgpu.vertexFn({
  in: instancedQuadIn,
  out: instancedQuadVarying,
})((input) => {
  "use gpu";
  const element =
    pageLayout.$.effectElements[
      ringLightLayout.$.ringLights[input.instance].element
    ];
  return {
    position: elementQuad(input.vertex, element, RIM_REACH),
    instance: input.instance,
  };
});

/** The light of one instance at a pixel. */
const ringLightFragment = tgpu.fragmentFn({
  in: instancedQuadVarying,
  out: d.vec4f,
})((input) => {
  "use gpu";
  const ring = ringLightLayout.$.ringLights[input.instance];
  const element = pageLayout.$.effectElements[ring.element];
  const page = fragmentToPage(input.position.xy);
  const pixel = 1 / targetLayout.$.effectTarget.pixelScale.x;
  const edge = effectElementDistance(element, page);
  const across = edge + INSET;

  if (std.abs(across) >= RIM_REACH) {
    return d.vec4f(0);
  }
  const radii = element.radii;
  const radius = cornerRadius(
    element.rect.z,
    element.rect.w,
    std.min(std.min(radii.x, radii.y), std.min(radii.z, radii.w)),
  );
  const length = std.max(
    outlineLength(element.rect.z, element.rect.w, radius),
    1,
  );
  const local = page.sub(element.rect.xy);
  const along =
    outlineParam(element.rect.z, element.rect.w, radius, local.x, local.y) /
    length;
  let light = d.f32(ring.even);
  let shape = d.f32(1);
  let head = d.f32(1);
  if (ring.comet.z > 0) {
    // How far behind the head this point is, as a share of the outline.
    const behind = std.fract((ring.comet.x - along) * ring.comet.y);
    const back = (behind * length) / HEAD_LENGTH;
    const ahead = ((1 - behind) * length) / FRONT_LENGTH;
    const atHead = std.max(std.exp(-back * back), std.exp(-ahead * ahead));
    const tail =
      std.pow(std.saturate(1 - behind / ring.comet.w), 1.2) * TAIL_GAIN;
    const lit = std.max(atHead, tail);
    if (ring.comet.z * lit > light) {
      light = ring.comet.z * lit;
      shape = lit;
      head = atHead;
    }
  }
  const half = CORE_HALF_WIDTH * std.mix(TAIL_WIDTH, 1, shape);
  const core = band(across, half, pixel) * light;
  const spread = across / BLOOM_SIGMA;
  const bloom = std.exp(-spread * spread) * light * std.mix(0.4, 1, head);
  const white = std.mix(1 - TAIL_TINT, 1, head);
  if (core + bloom < MIN_LIGHT) {
    return d.vec4f(0);
  }

  const onPage =
    std.smoothstep(-0.5 * pixel, 0.5 * pixel, edge) * ring.pageTint;
  const glint = std.mix(
    std.mix(ring.tint.xyz, ring.core.xyz, white),
    ring.bloom.xyz,
    onPage,
  );
  const clip = effectClip(element.scope, page) * ring.alpha;
  const coreAlpha = std.saturate(core) * ring.core.w;
  const bloomAlpha = std.saturate(bloom);
  const alpha = (coreAlpha + bloomAlpha * (1 - coreAlpha)) * clip;
  const rgb = glint
    .mul(coreAlpha)
    .add(ring.bloom.xyz.mul(bloomAlpha * (1 - coreAlpha)))
    .mul(clip);
  return d.vec4f(effectGrayscale(rgb, element.grayscale), alpha);
});

/**
 * The render shader of the Ring light effect, for `createInstancedDraw`:
 * one quad for each entry of `ringLights`.
 *
 * @internal
 */
export const ringLightShader = {
  vertex: ringLightVertex,
  fragment: ringLightFragment,
};
