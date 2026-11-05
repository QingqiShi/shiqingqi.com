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
import { FLAG_COVER, FLAG_SEE_THROUGH } from "./liquid-instance-value.ts";
import { LiquidInstance, liquidLayout } from "./liquid-layout.ts";
import { liquidLens, solidAt, solidBody, TO_LIGHT } from "./liquid-lens.ts";
import { liquidSurface } from "./liquid-surface.ts";
import { litEdge, over } from "./lit-edge.ts";
import { pageLayout } from "./page-layout.ts";
import { targetLayout } from "./target-layout.ts";
import {
  frameDir,
  pageUp,
  toTrackFrame,
  trackInFrame,
  type Liquid,
  type Track,
} from "./to-track-frame.ts";
import { coverAt, trackAt } from "./track-at.ts";

/**
 * The most of the page that the set part of a body in front of it covers,
 * so the labels under it stay legible.
 */
const SEE_THROUGH_COVER = 0.5;
const SHADOW_REACH = 3;
const SHADOW = 0.18;

/** The quad of one instance, over its track, corner by corner as a triangle strip. */
const liquidVertex = tgpu.vertexFn({
  in: instancedQuadIn,
  out: instancedQuadVarying,
})((input) => {
  "use gpu";
  const element =
    pageLayout.$.effectElements[liquidLayout.$.liquids[input.instance].element];
  return {
    position: elementQuad(input.vertex, element, 0),
    instance: input.instance,
  };
});

/** The control's own ring and shadows round the solid surface, outside it. */
const restShadow = (
  liquid: Liquid,
  page: d.v2f,
  distance: number,
  spread: number,
) => {
  "use gpu";
  const ring =
    liquid.edge.x * std.saturate(1 - distance / 0.5) * std.step(0, distance);
  let near = d.f32(0);
  let far = d.f32(0);
  if (liquid.edge.y > 0) {
    const up = pageUp(liquid);
    near =
      liquid.edge.y *
      (1 -
        std.smoothstep(
          -1,
          2,
          liquidSurface(liquid, page.sub(up), spread).surface.signedDistance,
        ));
    far =
      liquid.edge.z *
      (1 -
        std.smoothstep(
          -3,
          7,
          liquidSurface(liquid, page.sub(up.mul(2.5)), spread).surface
            .signedDistance,
        ));
  }
  return 1 - (1 - ring) * (1 - near) * (1 - far);
};

/**
 * The liquid over `under`, as much of it as `shown`, with as much of its
 * lit edge as `edgeLit`.
 */
const drawBody = (
  liquid: Liquid,
  track: Track,
  page: d.v2f,
  under: d.v4f,
  shown: number,
  edgeLit: number,
) => {
  "use gpu";
  const pixel = targetLayout.$.effectTarget.pixelScale.x;
  const seeThrough = (liquid.flags & FLAG_SEE_THROUGH) !== 0;
  const firm = liquid.firm;
  const melted = 1 - firm;
  let acc = d.vec4f(under);

  const spread = liquid.spread * melted;
  const found = liquidSurface(liquid, page, spread);
  const surface = found.surface;
  const distance = surface.signedDistance;

  if (shown > 0 && distance < 16) {
    const coverage = std.saturate(0.5 - distance * pixel);
    // A contact shadow under the water, deeper on the side away from the
    // light, and the control's own shadows under the solid surface.
    const lee =
      0.5 - 0.5 * std.dot(surface.outward, frameDir(liquid, TO_LIGHT).xy);
    const contact =
      (1 - std.smoothstep(0, SHADOW_REACH, distance)) * lee * SHADOW * melted;
    let rest = d.f32(0);
    if (firm > 0) {
      rest = restShadow(liquid, page, distance, spread) * firm;
    }
    const shadow = (1 - (1 - contact) * (1 - rest)) * (1 - coverage) * shown;
    acc = over(d.vec4f(0, 0, 0, shadow), acc);

    if (coverage > 0) {
      // The solid part is the rest shape, so that the field's bumps do not
      // show in it: about the rest place while the body is calm, and about
      // the centre of the body's mass once it moves, so the melt moves with
      // it.
      const solidCentre = std.mix(
        liquid.centre,
        d.vec2f(liquid.restX, 0),
        liquid.calm,
      );
      const toCentre = page.sub(liquid.origin.add(solidCentre));
      const toCore = d.vec2f(
        std.max(std.abs(toCentre.x) - liquid.span, 0),
        toCentre.y,
      );
      const inward = std.saturate(
        1 - std.length(toCore) / (liquid.radius + spread),
      );
      const solid = solidAt(inward, firm);
      let above = d.f32(0);
      if (solid > 0 && liquid.edge.w > 0) {
        above = liquidSurface(liquid, page.sub(pageUp(liquid)), spread).surface
          .signedDistance;
      }
      const body = liquidLens(
        liquid,
        track,
        page,
        surface,
        found.radius,
        solid,
        solidBody(liquid, distance, above),
      );
      let layer = d.vec4f(body, 1);
      if (seeThrough) {
        // The liquid shows over the track as it is, and lets as much of the
        // page through as it can: the least alpha that gives the body over
        // the track's fill. Where it is lighter than the track, that alpha
        // keeps a white label under it white. A set body much lighter than
        // a light track needs an alpha near one, which hides a dark label
        // under it, so where the body is set the alpha stops at
        // SEE_THROUGH_COVER, and the body shows a little nearer the track's
        // fill. The colour stays at or below the alpha: Chrome drops the
        // light of a premultiplied colour above its alpha when it converts
        // the canvas for a wide-gamut display.
        const behind = trackAt(liquid, track, page);
        const darker = d.vec3f(1).sub(body.div(std.max(behind, d.vec3f(1e-3))));
        const lighter = body
          .sub(behind)
          .div(std.max(d.vec3f(1).sub(behind), d.vec3f(1e-3)));
        const needed = std.max(darker, lighter);
        const cover = std.mix(1, SEE_THROUGH_COVER, solid);
        const alpha = std.min(
          std.saturate(std.max(needed.x, std.max(needed.y, needed.z))),
          cover,
        );
        layer = d.vec4f(
          std.clamp(
            body.sub(behind.mul(1 - alpha)),
            d.vec3f(0),
            d.vec3f(alpha),
          ),
          alpha,
        );
      }
      acc = over(layer.mul(coverage * shown), acc);
    }
  }

  if (edgeLit > 0 && distance < 4) {
    acc = litEdge(acc, page, distance, surface.outward, liquid, edgeLit);
  }
  return acc;
};

/**
 * Each control's liquid over its track. On a Switch it paints the track
 * while the liquid moves: the on fill rises through the off fill, ahead
 * under the liquid. Then it paints the liquid as water: the field of the
 * particles gives the body its surface, which a smooth union joins to each
 * bead's, so a bead swells out of the body and pinches off on a neck, and
 * joins it again the same way. A dome over that surface bends what the
 * track shows through it, and the dome's slope lights it with a thin rim, a
 * highlight and a caustic. As far as the body has set it is the control's
 * own solid surface, with its edge and its shadows, so that it settles into
 * the look the control has at rest. At rest the control draws its own
 * surface, and the shader adds to it only the lit edge that a pointer over
 * the control asks for. Under reduced motion it fades the solid surface out
 * of its old place as it fades it into the new one.
 */
const liquidFragment = tgpu.fragmentFn({
  in: instancedQuadVarying,
  out: d.vec4f,
})((input) => {
  "use gpu";
  const liquid = liquidLayout.$.liquids[input.instance];
  const track = trackInFrame(
    liquid,
    pageLayout.$.effectElements[liquid.element],
  );
  const onPage = fragmentToPage(input.position.xy);
  const page = toTrackFrame(liquid, onPage);
  const pixel = targetLayout.$.effectTarget.pixelScale.x;
  const seeThrough = (liquid.flags & FLAG_SEE_THROUGH) !== 0;
  // A liquid in front of the page stays inside the track's padding box.
  const inset = std.select(
    d.f32(0),
    track.rect.w * 0.5 - liquid.radius - liquid.spread,
    seeThrough,
  );
  const onTrack = std.saturate(
    0.5 - (effectElementDistance(track, page) + std.max(inset, 0)) * pixel,
  );
  if (onTrack <= 0) {
    return d.vec4f(0);
  }
  const clip = onTrack * effectClip(track.scope, onPage);

  let acc = d.vec4f(0);
  if ((liquid.flags & FLAG_COVER) !== 0) {
    acc = d.vec4f(coverAt(liquid, track, page), 1).mul(liquid.body);
  }
  const fading = liquid.leaving.z;
  if (fading > 0) {
    const leaving = LiquidInstance(liquid);
    leaving.restX = liquid.leaving.x;
    leaving.centre = d.vec2f(liquid.leaving.x, 0);
    leaving.span = liquid.leaving.y;
    leaving.calm = 1;
    leaving.beadCount = 0;
    acc = drawBody(leaving, track, page, acc, fading, liquid.edgeLit * fading);
  }
  acc = drawBody(liquid, track, page, acc, liquid.body, liquid.edgeLit);
  return d.vec4f(effectGrayscale(acc.xyz, track.grayscale), acc.w).mul(clip);
});

/**
 * The render shader of the Liquid effect, for `createInstancedDraw`: one
 * quad over the track for each entry of `liquids`.
 *
 * @internal
 */
export const liquidShader = {
  vertex: liquidVertex,
  fragment: liquidFragment,
};
