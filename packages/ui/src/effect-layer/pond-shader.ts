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
import { pondLayout } from "./pond-layout.ts";
import { POND, PROFILE_STEP } from "./pond.ts";
import { TO_LIGHT, refractionOffset } from "./refraction-offset.ts";

const MIN_ALPHA = 1 / 512;
/**
 * The light that a slope gains or loses over the flat water, as a share.
 * A face of a crest glints along its steepest line, fully where it gains
 * `GLINT_FULL`, and the glint dims by `GLINT_SHINE` as the face turns from
 * the light. A face that turns away is in shade, fully where it loses
 * `SHADE_FULL`.
 */
const GLINT_FULL = 0.06;
const GLINT_SHINE = 1.5;
const SHADE_FULL = 0.08;
/**
 * How far the glint reaches from the steepest line of a face, as a share
 * of a wavelength's turn of the slope. The shade reaches twice as far.
 */
const GLINT_WIDTH = 0.16;
const SHADE_SPREAD = 0.25;
/** The distance over which the curve of the water is read, in px. */
const CURVE_STEP = 1;
const WAVENUMBER = (2 * Math.PI) / POND.wavelength;

const pondVertex = tgpu.vertexFn({
  in: instancedQuadIn,
  out: instancedQuadVarying,
})((input) => {
  "use gpu";
  const pond = pondLayout.$.ponds[input.instance];
  const element = pageLayout.$.effectElements[pond.element];
  return {
    position: elementQuad(input.vertex, element, 0),
    instance: input.instance,
  };
});

/** The slope of the rings of one stone at `distance` from where it landed. */
const slopeAt = (instance: number, stone: number, distance: number) => {
  "use gpu";
  const place = std.max(distance, 0) / PROFILE_STEP;
  const below = d.u32(place);
  if (below + 1 >= pondLayout.$.ponds[instance].stones[stone].count) {
    return d.f32(0);
  }
  return std.mix(
    pondLayout.$.ponds[instance].stones[stone].profile[below],
    pondLayout.$.ponds[instance].stones[stone].profile[below + 1],
    std.fract(place),
  );
};

/**
 * The water of one instance at a pixel. The height of the water is the sum
 * of the rings of its stones, and so are its slope and its curve. The slope
 * tilts the surface: it bends the element's content under it, when the pond
 * owns the content, and the slopes that face the light glint over it, and
 * the slopes that face away are in shade. The light is the liquid's, so the
 * water belongs with it. The tilt fades out over the shore, and nothing
 * shows outside the element.
 */
const pondFragment = tgpu.fragmentFn({
  in: instancedQuadVarying,
  out: d.vec4f,
})((input) => {
  "use gpu";
  const pond = pondLayout.$.ponds[input.instance];
  const element = pageLayout.$.effectElements[pond.element];
  const page = fragmentToPage(input.position.xy);
  const keep = std.smoothstep(
    0,
    POND.shore,
    -effectElementDistance(element, page),
  );
  if (keep <= 0) {
    return d.vec4f(0);
  }
  const local = page
    .sub(element.rect.xy)
    .mul(pond.size.div(std.max(element.rect.zw, d.vec2f(1))));
  // The slope of the water, uphill, and its curve: the change of the slope
  // along each axis. A ring changes its slope outward by its own curve, and
  // across by its slope over its radius.
  let uphill = d.vec2f(0);
  let curveXX = d.f32(0);
  let curveXY = d.f32(0);
  let curveYY = d.f32(0);
  for (let stone = d.u32(0); stone < pond.stoneCount; stone += 1) {
    const offset = local.sub(pond.stones[stone].origin);
    const distance = std.max(std.length(offset), 1e-4);
    const outward = offset.div(distance);
    const slope = slopeAt(input.instance, stone, distance);
    const bendOfSlope =
      (slopeAt(input.instance, stone, distance + CURVE_STEP) -
        slopeAt(input.instance, stone, distance - CURVE_STEP)) /
      (2 * CURVE_STEP);
    const across = slope / distance;
    uphill = uphill.add(outward.mul(slope));
    curveXX += across + (bendOfSlope - across) * outward.x * outward.x;
    curveXY += (bendOfSlope - across) * outward.x * outward.y;
    curveYY += across + (bendOfSlope - across) * outward.y * outward.y;
  }
  const steepness = std.length(uphill);
  const normal = std.normalize(d.vec3f(uphill.mul(-keep), 1));
  const facing = std.dot(normal, TO_LIGHT) / TO_LIGHT.z - 1;
  // The face of a crest mirrors the light only along its steepest line,
  // where the slope stops growing along the way down the face.
  const down = uphill.div(std.max(steepness, 1e-5));
  const bendDown =
    curveXX * down.x * down.x +
    2 * curveXY * down.x * down.y +
    curveYY * down.y * down.y;
  const steep =
    bendDown / (std.max(steepness, 1e-5) * WAVENUMBER * GLINT_WIDTH);
  const glint =
    pond.glint *
    std.pow(std.saturate(facing / GLINT_FULL), GLINT_SHINE) *
    std.exp(-steep * steep);
  const shade =
    pond.shade *
    std.saturate(-facing / SHADE_FULL) *
    std.exp(-steep * steep * SHADE_SPREAD);
  const light = glint + shade * (1 - glint);
  let content = d.vec4f(0);
  if (pond.content !== 0) {
    content = contentAt(
      pond.element,
      page.add(refractionOffset(normal, d.f32(POND.depth), POND.index)),
    );
  }
  const alpha = light + content.w * (1 - light);
  if (alpha < MIN_ALPHA) {
    return d.vec4f(0);
  }
  const clip = effectClip(element.scope, page);
  return d
    .vec4f(content.xyz.mul(1 - light).add(d.vec3f(glint)), alpha)
    .mul(clip);
});

/**
 * The render shader of the Pond effect, for `createInstancedDraw`: one quad
 * for each entry of `ponds`.
 *
 * @internal
 */
export const pondShader = {
  vertex: pondVertex,
  fragment: pondFragment,
};
