import { d, std, tgpu } from "typegpu";
import { contentAt } from "./content-at.ts";
import { effectClip } from "./effect-clip.ts";
import { effectElementDistance } from "./effect-element-distance.ts";
import {
  elementQuad,
  fragmentToPage,
  instancedQuadIn,
  instancedQuadVarying,
} from "./element-quad.ts";
import { pageLayout } from "./page-layout.ts";
import { TO_LIGHT, refractionOffset } from "./refraction-offset.ts";
import { sliderLiquidLayout } from "./slider-liquid-layout.ts";
import { targetLayout } from "./target-layout.ts";

/**
 * The body of the liquid. Its rim curves down over a bevel this deep, as a
 * share of the panel's height, and the groove's content lies this deep under
 * its top, also as a share of the height, seen through water.
 */
const BEVEL = 0.26;
const DEPTH = 0.45;
const INDEX = 1.33;
/**
 * How milky the liquid is over the groove, on a light and on a dark
 * backdrop, so it keeps the presence of the panel it melted from.
 */
const LIGHT_TINT = 0.32;
const DARK_TINT = 0.07;
/** The glint where the rim faces the light, and how small it is. */
const GLINT = 0.55;
const GLINT_SHINE = 48;
/** The shade on the side of the rim that faces away from the light. */
const SHADE = 0.12;
/** The soft shadow the body casts on the groove, and how far it reaches, in px. */
const SHADOW = 0.1;
const SHADOW_REACH = 5;
/** The distance over which the slope of the body is read, in px. */
const SLOPE_STEP = 0.5;

/**
 * The signed distance to the panel, in its own px: below zero inside. The
 * panel is a rounded box from the left of the groove's inside to `edge`, as
 * tall as the inside. Its far edge swells by `bulge` in the middle and not
 * at the corners, as liquid that is pushed or that sloshes back. `shape` is
 * the edge, the bulge, the height and the corner radius. Each corner is a
 * superellipse of `power`: 2 is a circle, 4 a squircle.
 */
const panelDistance = tgpu.fn(
  [d.vec2f, d.vec4f, d.f32],
  d.f32,
)((p, shape, power) => {
  "use gpu";
  const edge = shape.x;
  const bulge = shape.y;
  const height = shape.z;
  const cornerRadius = shape.w;
  const across = std.clamp((p.y - height / 2) / (height / 2), -1, 1);
  const right = std.max(edge + bulge * (1 - across * across), height * 0.5);
  const half = d.vec2f(right / 2, height / 2);
  const radius = std.min(cornerRadius, std.min(half.x, half.y));
  const q = std.abs(p.sub(half)).sub(half).add(radius);
  const out = std.max(q, d.vec2f(0));
  const corner = std.pow(
    std.max(std.pow(out.x, power) + std.pow(out.y, power), 1e-20),
    1 / power,
  );
  return corner + std.min(std.max(q.x, q.y), 0) - radius;
});

/** The signed distance to one piece of the handle: a line down from `span.x` to `span.y` with round caps. */
const pieceDistance = tgpu.fn(
  [d.vec2f, d.f32, d.vec2f, d.f32],
  d.f32,
)((p, x, span, radius) => {
  "use gpu";
  const top = span.x + radius;
  const bottom = std.max(span.y - radius, top);
  const y = std.clamp(p.y, top, bottom);
  return std.length(p.sub(d.vec2f(x, y))) - radius;
});

const sliderLiquidVertex = tgpu.vertexFn({
  in: instancedQuadIn,
  out: instancedQuadVarying,
})((input) => {
  "use gpu";
  const slider = sliderLiquidLayout.$.sliders[input.instance];
  const element = pageLayout.$.effectElements[slider.element];
  return {
    position: elementQuad(input.vertex, element, 0),
    instance: input.instance,
  };
});

/**
 * The liquid panel of one Slider at a pixel. The body is clear and a little
 * milky. Its rim curves down like the edge of a drop, so the groove's
 * content under the rim bends, as `refractionOffset` gives it, and its flat
 * middle shows the content as it is. The rim glints where it faces the
 * light, and is in shade where it faces away. The handle lies on top, and
 * the body casts a soft shadow on the groove. Nothing shows outside the
 * groove.
 */
const sliderLiquidFragment = tgpu.fragmentFn({
  in: instancedQuadVarying,
  out: d.vec4f,
})((input) => {
  "use gpu";
  const slider = sliderLiquidLayout.$.sliders[input.instance];
  const element = pageLayout.$.effectElements[slider.element];
  const page = fragmentToPage(input.position.xy);
  const pixel = targetLayout.$.effectTarget.pixelScale.x;
  const inGroove = std.saturate(
    0.5 - effectElementDistance(element, page) * pixel,
  );
  if (inGroove <= 0) {
    return d.vec4f(0);
  }
  const scale = slider.size.div(std.max(element.rect.zw, d.vec2f(1)));
  const ownPixel = pixel / std.max(scale.x, 1e-4);
  const p = page.sub(element.rect.xy).mul(scale).sub(slider.inner.xy);
  const height = slider.inner.w;
  const shape = d.vec4f(slider.edge, slider.bulge, height, slider.corner);
  const distance = panelDistance(p, shape, slider.cornerPower);
  const below = panelDistance(p.sub(d.vec2f(0, 1)), shape, slider.cornerPower);
  const shadow =
    SHADOW * std.pow(1 - std.smoothstep(0, SHADOW_REACH, below), 2);
  const coverage = std.saturate(0.5 - distance * ownPixel);
  if (coverage <= 0 && shadow <= 0) {
    return d.vec4f(0);
  }

  const across = d.vec2f(SLOPE_STEP, 0);
  const down = d.vec2f(0, SLOPE_STEP);
  const slope = d.vec2f(
    panelDistance(p.add(across), shape, slider.cornerPower) -
      panelDistance(p.sub(across), shape, slider.cornerPower),
    panelDistance(p.add(down), shape, slider.cornerPower) -
      panelDistance(p.sub(down), shape, slider.cornerPower),
  );
  const outward = slope.div(std.max(std.length(slope), 1e-5));
  // How far the surface leans out, from 0 on the flat middle to nearly 1
  // at the rim, where the bevel is a quarter circle.
  const lean = std.min(std.saturate(1 + distance / (height * BEVEL)), 0.97);
  const normal = d.vec3f(outward.mul(lean), std.sqrt(1 - lean * lean));

  const content = contentAt(
    slider.element,
    page.add(
      refractionOffset(normal, height * DEPTH, INDEX).div(
        std.max(scale.x, 1e-4),
      ),
    ),
  );
  const groove = content.xyz.add(slider.under.xyz.mul(1 - content.w));
  const tint = std.select(LIGHT_TINT, DARK_TINT, slider.dark !== 0);
  let color = std.mix(groove, d.vec3f(1), tint * (0.6 + 0.4 * lean));

  const halfway = std.normalize(TO_LIGHT.add(d.vec3f(0, 0, 1)));
  const glint =
    GLINT * std.pow(std.saturate(std.dot(normal, halfway)), GLINT_SHINE);
  const away =
    SHADE *
    lean *
    lean *
    std.saturate(-std.dot(outward, std.normalize(TO_LIGHT.xy)));
  color = color.mul(1 - away).add(d.vec3f(glint));

  const mirrored = d.vec2f(
    2 * slider.handleCenter - slider.handleTop.y,
    2 * slider.handleCenter - slider.handleTop.x,
  );
  const handle = std.min(
    pieceDistance(p, slider.handleX, slider.handleTop, slider.handleRadius),
    pieceDistance(p, slider.handleX, mirrored, slider.handleRadius),
  );
  const onHandle = std.saturate(0.5 - handle * ownPixel) * slider.handleColor.w;
  color = std.mix(color, slider.handleColor.xyz, onHandle);

  const body = d.vec4f(color.mul(coverage), coverage);
  const cast = d.vec4f(0, 0, 0, shadow * (1 - coverage));
  return body
    .add(cast)
    .mul(slider.melt * inGroove * effectClip(element.scope, page));
});

/**
 * The render shader of the Slider liquid effect, for `createInstancedDraw`:
 * one quad for each entry of `sliders`.
 *
 * @internal
 */
export const sliderLiquidShader = {
  vertex: sliderLiquidVertex,
  fragment: sliderLiquidFragment,
};
