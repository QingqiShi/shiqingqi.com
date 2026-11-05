import { d, std } from "typegpu";
import { effectElementDistance } from "./effect-element-distance.ts";
import { targetLayout } from "./target-layout.ts";
import type { Liquid, Track } from "./to-track-frame.ts";

/**
 * How far the on fill rises ahead under the liquid along the track and
 * across it, as a share of the radius.
 */
const RISE_REACH = d.vec2f(1.9, 1.3);
/** How far ahead of the rest of the track the on fill rises under the liquid. */
const RISE_LEAD = 0.6;
/** The track's edge as it shows through the liquid, darker than the fill. */
const EDGE_SHADE = 0.3;

/**
 * How far the on fill has risen at a page point: further under the liquid
 * than on the rest of the track, with no edge between them.
 */
const risenAt = (liquid: Liquid, page: d.v2f) => {
  "use gpu";
  const reach = RISE_REACH.mul(liquid.radius);
  const fromCentre = page.sub(liquid.origin).sub(liquid.centre);
  const away = d
    .vec2f(std.max(std.abs(fromCentre.x) - liquid.span, 0), fromCentre.y)
    .div(reach);
  const rise = liquid.rise;
  return std.saturate(
    rise + (liquid.riseGoal - rise) * RISE_LEAD * std.exp(-std.dot(away, away)),
  );
};

const premultiplied = (color: d.v4f) => {
  "use gpu";
  return d.vec4f(color.xyz.mul(color.w), color.w);
};

/**
 * The track as the control draws it: the fill, with the ring inside its
 * edge. The ring changes from off to on as the fill does.
 *
 * @internal
 */
export const coverAt = (liquid: Liquid, track: Track, page: d.v2f) => {
  "use gpu";
  const risen = risenAt(liquid, page);
  const fill = std.mix(liquid.off, liquid.on, risen);
  const width = liquid.ringWidth;
  if (width <= 0) {
    return fill;
  }
  const ring = std.mix(
    premultiplied(liquid.ringOff),
    premultiplied(liquid.ringOn),
    risen,
  );
  const inRing = std.saturate(
    0.5 +
      (effectElementDistance(track, page) + width) *
        targetLayout.$.effectTarget.pixelScale.x,
  );
  return fill.mul(1 - ring.w * inRing).add(ring.xyz.mul(inRing));
};

/**
 * The colour of the track at a page point, as the liquid sees it.
 *
 * @internal
 */
export const trackAt = (liquid: Liquid, track: Track, page: d.v2f) => {
  "use gpu";
  const edge = effectElementDistance(track, page);
  const fill = coverAt(liquid, track, page);
  const shaded = std.mix(fill, liquid.backdrop, EDGE_SHADE);
  const rim = std.smoothstep(-1.5, 0, edge);
  return std.mix(
    std.mix(fill, shaded, rim),
    liquid.backdrop,
    std.smoothstep(0, 1, edge),
  );
};
