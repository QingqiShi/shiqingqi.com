import { LIQUID_MATERIAL_WGSL } from "./liquid-material-wgsl.ts";
import { LIQUID_SHARED_WGSL } from "./liquid-shared-wgsl.ts";
import { KERNEL_REACH, NECK_REACH } from "./step-liquid.ts";
import { TARGET_WGSL } from "./target-wgsl.ts";

/**
 * The reach of a particle in the drawn field, as a share of the rest
 * radius: wider than the simulation's, so that the surface is smooth.
 */
const FIELD_REACH = KERNEL_REACH * 1.5;
/**
 * The field's value on the surface: where the liquid at rest has the
 * thumb's radius, measured on the simulation's rest state.
 */
const FIELD_THRESHOLD = 9.93;

const FLAG_COVER = 1;
const FLAG_SEE_THROUGH = 2;
const FLAG_LIGHT_BODY = 4;
const FLAG_ROOM = 8;
/**
 * How far past its element a liquid with room draws, in rest radii: the
 * room, the body's reach past its walls, and its shadow.
 */
const ROOM_MARGIN = 5;

/**
 * A ring inside the edge of a track: its colour off and on, sRGB-encoded with
 * straight alpha, and its width in CSS px. A ring with no width is none.
 *
 * @internal
 */
export interface TrackRing {
  readonly off: readonly [number, number, number, number];
  readonly on: readonly [number, number, number, number];
  readonly width: number;
}

/**
 * One control's liquid as a frame draws it, in page coordinates and CSS px:
 * a Switch's thumb or a segmented control's indicator.
 *
 * @internal
 */
export interface LiquidInstance {
  /** Its control's index in `EffectFrame.elements` and in WGSL's `effectElements`. */
  readonly elementIndex: number;
  /** The slot of the simulation buffer that holds its particles, and how many of them are in use. */
  readonly slot: number;
  readonly particleCount: number;
  /** Its beads' range in the bead buffer. */
  readonly firstBead: number;
  readonly beadCount: number;
  /** The rest radius: half the height of the thumb or the indicator. */
  readonly radius: number;
  /**
   * The radius of the solid rest shape, which the liquid sets into: the
   * rest radius for a control, and less for a grabber, whose liquid swells
   * out of its bar.
   */
  readonly restRadius: number;
  /**
   * Half the length of the solid rest shape's straight part, in CSS px:
   * `span` for a control, and the bar's for a grabber, whose liquid beads
   * up shorter than the bar.
   */
  readonly restSpan: number;
  /** From 0 while the liquid moves to 1 once it rests in its rest shape. */
  readonly calm: number;
  /** The centre of the off position, where track space starts. */
  readonly originX: number;
  readonly originY: number;
  /** Where the centre of the rest shape is now, along the track. */
  readonly restX: number;
  /**
   * Half the length of the rest shape's straight part: the rest shape is a
   * capsule, and a thumb's is a circle, with no span.
   */
  readonly span: number;
  /** The reach of each particle, as `LiquidBody.scale` gives it. */
  readonly scale: number;
  /** How far the melted liquid spreads past its rest shape. */
  readonly spread: number;
  /** The centre of the liquid's mass, in track space and CSS px. */
  readonly centreX: number;
  readonly centreY: number;
  /** The selected surface's colour over the track, sRGB-encoded. */
  readonly thumb: readonly [number, number, number];
  /** How solid the surface is, from 0 as clear water to 1 as the control's own solid surface. */
  readonly set: number;
  /** The selected surface's colour is light, so a light highlight on it does not show. */
  readonly lightBody: boolean;
  /** The track's off fill and its on fill. */
  readonly off: readonly [number, number, number];
  readonly on: readonly [number, number, number];
  /** The ring inside the track's edge, which changes from off to on with the fill. */
  readonly ring: TrackRing;
  /**
   * How far the on fill has risen through the track, from 0 off to 1 on,
   * and how far it rises to.
   */
  readonly rise: number;
  readonly riseGoal: number;
  /** The effect paints the track, not only the liquid. */
  readonly cover: boolean;
  /** The track shows through the liquid, as through a segmented control's indicator. */
  readonly seeThrough: boolean;
  /**
   * The liquid has room across its track, on a plain surface: a grabber's.
   * It draws past its element, is not clipped to it, and what shows
   * through it is the surface's one colour.
   */
  readonly room: boolean;
  /** The corners of the rest shape, or none for a pill. */
  readonly corner?: { readonly radius: number; readonly exponent: number };
  /** What the page shows around the track. */
  readonly backdrop: readonly [number, number, number];
  /** How much of the liquid the effect draws: 1 in motion, 0 at rest, where the control draws it. */
  readonly body: number;
  /** The way to the light, a unit vector. */
  readonly light: readonly [number, number];
  /** The control's own edge, which the effect draws round the solid surface: ring, two shadows, inset ring. */
  readonly edge: readonly [number, number, number, number];
  /** How much of the lit edge it draws, from 0 to 1. */
  readonly edgeLit: number;
  /**
   * Under reduced motion, the solid rest shape that fades out as the new one
   * fades in: the centre of its straight part along the track and half its
   * length, in CSS px, and how much of it the effect draws. None at 0.
   */
  readonly leaving: readonly [number, number, number];
  /**
   * For a liquid with room: where the surface it sits on ends, as a page
   * y above which there is no surface, and the colour that shows there.
   * None for a control.
   */
  readonly surface?: {
    readonly edge: number;
    readonly above: readonly [number, number, number];
  };
}

/**
 * One bead on the track, in page coordinates and CSS px.
 *
 * @internal
 */
export interface LiquidBeadInstance {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

/**
 * The render shader of the Liquid effect, with each control's liquid this
 * frame in group 2. Each instance is one control: a quad over its track.
 * On a Switch it paints the track while the liquid moves: the on fill
 * rises through the off fill, ahead under the liquid. Then it paints the
 * liquid as water: the field of the particles gives the body its surface,
 * which a smooth union joins to each bead's, so a bead swells out of the
 * body and pinches off on a neck, and joins it again the same way. A dome
 * over that surface bends what the track shows through it, and the dome's
 * slope lights it with a thin rim, a highlight and a caustic. As far as the
 * body has set it is the control's own solid surface, with its edge and
 * its shadows, so that it settles into the look the control has at rest.
 * At rest the control draws its own surface, and the shader adds only a lit
 * edge to it. Under reduced motion it fades the solid surface out of its old
 * place as it fades it into the new one.
 *
 * @internal
 */
export const LIQUID_WGSL = /* wgsl */ `${TARGET_WGSL}
${LIQUID_MATERIAL_WGSL}
${LIQUID_SHARED_WGSL}
const FIELD_REACH = ${FIELD_REACH.toFixed(4)};
const FIELD_THRESHOLD = ${FIELD_THRESHOLD.toFixed(3)};
const FLAG_COVER = ${String(FLAG_COVER)}u;
const FLAG_SEE_THROUGH = ${String(FLAG_SEE_THROUGH)}u;
const FLAG_LIGHT_BODY = ${String(FLAG_LIGHT_BODY)}u;
const FLAG_ROOM = ${String(FLAG_ROOM)}u;
const ROOM_MARGIN = ${ROOM_MARGIN.toFixed(1)};
const ROOM_WET = 0.9;
const NECK_REACH = ${NECK_REACH.toFixed(4)};
const BEAD_JOIN = 1.0;
const SHADOW_REACH = 3.0;
const SHADOW = 0.18;
// How far the on fill rises ahead under the liquid along the track and
// across it, as a share of the radius.
const RISE_REACH = vec2f(1.9, 1.3);
// How far ahead of the rest of the track the on fill rises under the
// liquid.
const RISE_LEAD = 0.6;
// The track's edge as it shows through the liquid, darker than the fill.
const EDGE_SHADE = 0.3;

struct LiquidInstance {
  element: u32,
  slot: u32,
  particleCount: u32,
  firstBead: u32,
  beadCount: u32,
  flags: u32,
  radius: f32,
  calm: f32,
  // The centre of the off position.
  origin: vec2f,
  // How much of the liquid it draws, and how much of the lit edge.
  body: f32,
  edgeLit: f32,
  // The surface's colour and how solid it is.
  thumb: vec4f,
  // The off fill and how far the on fill has risen, then the on fill and
  // how far it rises to.
  off: vec4f,
  on: vec4f,
  // What the page shows round the track, and how far the melted liquid
  // spreads.
  backdrop: vec4f,
  // Where the liquid rests, along the track, the centre of its mass, and
  // half the length of the rest shape's straight part.
  rest: vec4f,
  // The way to the light, the reach of the particles, and the width of the
  // ring inside the track's edge.
  light: vec4f,
  edge: vec4f,
  // The ring inside the track's edge, off and on, with straight alpha.
  ringOff: vec4f,
  ringOn: vec4f,
  // The radius and the exponent of the rest shape's corners, or zero for a
  // pill, then the radius of the solid rest shape and half the length of
  // its straight part.
  corner: vec4f,
  // Under reduced motion, the rest shape that fades out: where it is along
  // the track, half the length of its straight part, and how much of it
  // shows.
  leaving: vec4f,
  // With room, the page y where the surface under the liquid ends, and the
  // colour above it.
  surface: vec4f,
}

struct Bead {
  centre: vec2f,
  radius: f32,
}

@group(2) @binding(0) var<storage, read> liquids: array<LiquidInstance>;
@group(2) @binding(1) var<storage, read> slots: array<LiquidSlot>;
@group(2) @binding(2) var<storage, read> beads: array<Bead>;

struct LiquidVarying {
  @builtin(position) position: vec4f,
  @location(0) @interpolate(flat) instance: u32,
}

@vertex
fn liquidVertex(
  @builtin(vertex_index) vertex: u32,
  @builtin(instance_index) instance: u32,
) -> LiquidVarying {
  let liquid = liquids[instance];
  let element = effectElements[liquid.element];
  let corner = vec2f(f32(vertex & 1u), f32((vertex >> 1u) & 1u));
  // A liquid with room draws past its element, as far as its room goes.
  let margin = select(0.0, ROOM_MARGIN * liquid.radius, (liquid.flags & FLAG_ROOM) != 0u);
  let rect = element.rect + vec4f(-margin, -margin, 2.0 * margin, 2.0 * margin);
  return LiquidVarying(pageToClip(rect.xy + corner * rect.zw), instance);
}

// How far the on fill has risen at a page point: further under the liquid
// than on the rest of the track, with no edge between them.
fn risenAt(liquid: LiquidInstance, page: vec2f) -> f32 {
  let reach = liquid.radius * RISE_REACH;
  let fromCentre = page - liquid.origin - liquid.rest.yz;
  let away = vec2f(max(abs(fromCentre.x) - liquid.rest.w, 0.0), fromCentre.y) / reach;
  let rise = liquid.off.w;
  return saturate(rise + (liquid.on.w - rise) * RISE_LEAD * exp(-dot(away, away)));
}

// The track as the control draws it: the fill, with the ring inside its
// edge. The ring changes from off to on as the fill does.
fn coverAt(liquid: LiquidInstance, track: EffectElement, page: vec2f) -> vec3f {
  let risen = risenAt(liquid, page);
  let fill = mix(liquid.off.rgb, liquid.on.rgb, risen);
  let width = liquid.light.w;
  if (width <= 0.0) {
    return fill;
  }
  let ring = mix(premultiplied(liquid.ringOff), premultiplied(liquid.ringOn), risen);
  let inRing = saturate(0.5 + (effectElementDistance(track, page) + width) * effectTarget.pixelScale.x);
  return fill * (1.0 - ring.a * inRing) + ring.rgb * inRing;
}

// The colour of the track at a page point, as the liquid sees it. A liquid
// with room sits on a plain surface, which is one colour.
fn trackAt(liquid: LiquidInstance, track: EffectElement, page: vec2f) -> vec3f {
  if ((liquid.flags & FLAG_ROOM) != 0u) {
    let past = 1.0 - smoothstep(-0.5, 0.5, page.y - liquid.surface.x);
    return mix(liquid.off.rgb, liquid.surface.yzw, past);
  }
  let edge = effectElementDistance(track, page);
  let fill = coverAt(liquid, track, page);
  let shaded = mix(fill, liquid.backdrop.rgb, EDGE_SHADE);
  let rim = smoothstep(-1.5, 0.0, edge);
  return mix(mix(fill, shaded, rim), liquid.backdrop.rgb, smoothstep(0.0, 1.0, edge));
}

// The particles' field at a page point, with its gradient. The particles
// are in track space: rest radii from the origin.
fn fieldAt(liquid: LiquidInstance, page: vec2f) -> vec3f {
  let reach = FIELD_REACH * liquid.radius * liquid.light.z;
  let reachSquared = reach * reach;
  var value = 0.0;
  var gradient = vec2f(0.0);
  let local = page - liquid.origin;
  // No particle reaches a point beyond their extent along the track. The
  // extra pixel keeps rounding from losing a particle at its full reach.
  let extent = slots[liquid.slot].walls.zw * liquid.radius;
  if (local.x < extent.x - reach - 1.0 || local.x > extent.y + reach + 1.0) {
    return vec3f(0.0);
  }
  for (var i = 0u; i < liquid.particleCount; i += 1u) {
    let offset = local - slots[liquid.slot].particles[i].xy * liquid.radius;
    let distanceSquared = dot(offset, offset);
    if (distanceSquared < reachSquared) {
      let q = 1.0 - distanceSquared / reachSquared;
      value += q * q;
      gradient -= 4.0 * q * offset / reachSquared;
    }
  }
  return vec3f(value, gradient);
}

// The solid rest shape's radius and half the length of its straight part.
// A liquid with room beads up rounder than its bar while it moves, and
// sets back into the bar as it calms, so its rest shape goes from the
// drop's to the bar's with calm.
fn restShape(liquid: LiquidInstance) -> vec2f {
  var shape = liquid.corner.zw;
  if ((liquid.flags & FLAG_ROOM) != 0u) {
    shape = mix(vec2f(liquid.radius, liquid.rest.w), shape, liquid.calm);
  }
  return shape;
}

// The distance from the rest shape: a pill, or a box with the corners of
// the control's own indicator.
fn restDistance(liquid: LiquidInstance, page: vec2f) -> f32 {
  let local = page - (liquid.origin + vec2f(liquid.rest.x, 0.0));
  let rest = restShape(liquid);
  let restRadius = rest.x;
  let restSpan = rest.y;
  if (liquid.corner.y == 0.0) {
    let toRest = local - vec2f(clamp(local.x, -restSpan, restSpan), 0.0);
    return length(toRest) - restRadius;
  }
  var shape = effectElements[liquid.element];
  let half = vec2f(restSpan + restRadius, restRadius);
  shape.rect = vec4f(liquid.origin + vec2f(liquid.rest.x, 0.0) - half, 2.0 * half);
  shape.radii = vec4f(min(liquid.corner.x, restRadius));
  shape.cornerExponent = liquid.corner.y;
  return effectElementDistance(shape, page);
}

// The rest shape's outward normal, from the slope of its distance.
fn restOutward(liquid: LiquidInstance, page: vec2f) -> vec2f {
  let e = 0.5;
  let gradient = vec2f(
    restDistance(liquid, page + vec2f(e, 0.0)) - restDistance(liquid, page - vec2f(e, 0.0)),
    restDistance(liquid, page + vec2f(0.0, e)) - restDistance(liquid, page - vec2f(0.0, e)),
  );
  return normalize(gradient + vec2f(1e-5, 0.0));
}

fn bodySurface(liquid: LiquidInstance, page: vec2f) -> Surface {
  let fromRest = restDistance(liquid, page);
  let calm = liquid.calm;
  if (calm >= 1.0) {
    return Surface(fromRest, restOutward(liquid, page));
  }
  let local = page - (liquid.origin + vec2f(liquid.rest.x, 0.0));
  let toRest = local - vec2f(clamp(local.x, -liquid.rest.w, liquid.rest.w), 0.0);
  let restNormal = toRest / max(length(toRest), 1e-4);
  let field = fieldAt(liquid, page);
  let slope = max(length(field.yz), 1e-4);
  let fromField = (FIELD_THRESHOLD - field.x) / slope;
  var outward = -field.yz / slope;
  if (field.x <= 0.0) {
    outward = vec2f(0.0);
  }
  // Where the field peaks its slope is near zero and the distance from it
  // runs away, so it is held to the radius, where the dome is flat anyway.
  let far = select(fromField, liquid.radius, field.x <= 0.0);
  return Surface(
    mix(clamp(far, -liquid.radius, liquid.radius), fromRest, calm),
    normalize(mix(outward, restNormal, calm) + vec2f(1e-5, 0.0)),
  );
}

// The liquid's surface: the body's, joined to the beads' by a smooth union,
// with the radius of the dome over it, which runs from the body's to a
// bead's through the neck between them. Beads that touch join each other
// only a little, so that they do not run together into one lobe.
struct Liquid {
  surface: Surface,
  radius: f32,
}

fn liquidSurface(liquid: LiquidInstance, page: vec2f, spread: f32) -> Liquid {
  var distance = 1e4;
  var outward = vec2f(0.0);
  var radius = 0.0;
  var reach = 1e-4;
  for (var i = liquid.firstBead; i < liquid.firstBead + liquid.beadCount; i += 1u) {
    let bead = beads[i];
    let toBead = page - bead.centre;
    let beadDistance = length(toBead) - bead.radius;
    let join = max(BEAD_JOIN * bead.radius, 1e-4);
    let kept = saturate(0.5 + 0.5 * (beadDistance - distance) / join);
    distance = mix(beadDistance, distance, kept) - join * kept * (1.0 - kept);
    outward = mix(toBead / max(length(toBead), 1e-4), outward, kept);
    radius = mix(bead.radius, radius, kept);
    reach = mix(max(NECK_REACH * bead.radius, 1e-4), reach, kept);
  }
  let body = bodySurface(liquid, page);
  let bodyDistance = body.distance - spread;
  let kept = saturate(0.5 + 0.5 * (distance - bodyDistance) / reach);
  return Liquid(
    Surface(
      mix(distance, bodyDistance, kept) - reach * kept * (1.0 - kept),
      normalize(mix(outward, body.outward, kept) + vec2f(1e-5, 0.0)),
    ),
    mix(radius, liquid.radius + spread, kept),
  );
}

// The solid surface as the control draws it at rest: its colour, with its
// inset ring and its top light in dark. above is the distance from the
// surface 1 px up.
fn solidBody(liquid: LiquidInstance, distance: f32, above: f32) -> vec3f {
  var body = liquid.thumb.rgb;
  if (liquid.edge.w > 0.0) {
    let ring = liquid.edge.w * saturate(1.0 + distance);
    let top = 0.6 * liquid.edge.w * saturate(above + 0.5);
    body = mix(body, vec3f(1.0), saturate(ring + top));
  }
  return body;
}

// A drop of water over the track: the track as it shows through the dome,
// lit by a thin rim, a highlight and a caustic, and solid as far as it has
// set.
fn lens(
  liquid: LiquidInstance,
  track: EffectElement,
  page: vec2f,
  surface: Surface,
  radius: f32,
  solid: f32,
  solidColor: vec3f,
) -> vec3f {
  if (solid >= 1.0) {
    return solidColor;
  }
  let depth = -surface.distance;
  let dome = domeAt(depth, radius, surface.outward);
  let behind = trackAt(liquid, track, page + dome.bend);
  // Water in front of the page does not darken it.
  let dry = (liquid.flags & FLAG_SEE_THROUGH) != 0u;
  // A drop on a plain surface shows mostly by its shade, so it is a little
  // darker than one on a track.
  let wet = select(WET, ROOM_WET, (liquid.flags & FLAG_ROOM) != 0u);
  let color = wetShade(behind, dome, surface.outward, depth, radius, dry, wet);
  if (solid <= 0.0) {
    return color;
  }
  return mix(color, solidColor, solid);
}

// The control's own ring and shadows round the solid surface, outside it.
fn restShadow(liquid: LiquidInstance, page: vec2f, distance: f32, spread: f32) -> f32 {
  let ring = liquid.edge.x * saturate(1.0 - distance / 0.5) * step(0.0, distance);
  var near = 0.0;
  var far = 0.0;
  if (liquid.edge.y > 0.0) {
    near = liquid.edge.y * (1.0 - smoothstep(-1.0, 2.0, liquidSurface(liquid, page - vec2f(0.0, 1.0), spread).surface.distance));
    far = liquid.edge.z * (1.0 - smoothstep(-3.0, 7.0, liquidSurface(liquid, page - vec2f(0.0, 2.5), spread).surface.distance));
  }
  return 1.0 - (1.0 - ring) * (1.0 - near) * (1.0 - far);
}

@fragment
fn liquidFragment(input: LiquidVarying) -> @location(0) vec4f {
  let liquid = liquids[input.instance];
  let track = effectElements[liquid.element];
  let page = fragmentToPage(input.position.xy);
  let pixel = effectTarget.pixelScale.x;
  let seeThrough = (liquid.flags & FLAG_SEE_THROUGH) != 0u;
  // A liquid in front of the page stays inside the track's padding box. A
  // liquid with room is not held to its element.
  let inset = select(0.0, track.rect.w * 0.5 - liquid.radius - liquid.backdrop.w, seeThrough);
  let onTrack = select(
    saturate(0.5 - (effectElementDistance(track, page) + max(inset, 0.0)) * pixel),
    1.0,
    (liquid.flags & FLAG_ROOM) != 0u,
  );
  if (onTrack <= 0.0) {
    return vec4f(0.0);
  }
  let clip = onTrack * effectClip(track.scope, page);

  var acc = vec4f(0.0);
  if ((liquid.flags & FLAG_COVER) != 0u) {
    acc = vec4f(coverAt(liquid, track, page), 1.0) * liquid.body;
  }
  let fading = liquid.leaving.z;
  if (fading > 0.0) {
    var leaving = liquid;
    leaving.rest = vec4f(liquid.leaving.x, liquid.leaving.x, 0.0, liquid.leaving.y);
    leaving.calm = 1.0;
    leaving.beadCount = 0u;
    acc = drawBody(leaving, track, page, acc, fading, liquid.edgeLit * fading);
  }
  acc = drawBody(liquid, track, page, acc, liquid.body, liquid.edgeLit);
  return vec4f(effectGrayscale(acc.rgb, track.grayscale), acc.a) * clip;
}

// The liquid over acc, as much of it as shown, with as much of its lit
// edge as edgeLit.
fn drawBody(
  liquid: LiquidInstance,
  track: EffectElement,
  page: vec2f,
  under: vec4f,
  shown: f32,
  edgeLit: f32,
) -> vec4f {
  let pixel = effectTarget.pixelScale.x;
  let seeThrough = (liquid.flags & FLAG_SEE_THROUGH) != 0u;
  let firm = liquid.thumb.w;
  let melted = 1.0 - firm;
  var acc = under;

  let spread = liquid.backdrop.w * melted;
  let found = liquidSurface(liquid, page, spread);
  let surface = found.surface;
  let d = surface.distance;

  if (shown > 0.0 && d < 16.0) {
    let coverage = saturate(0.5 - d * pixel);
    // A contact shadow under the water, deeper on the side away from the
    // light, and the control's own shadows under the solid surface.
    let lee = 0.5 - 0.5 * dot(surface.outward, TO_LIGHT.xy);
    let contact = (1.0 - smoothstep(0.0, SHADOW_REACH, d)) * lee * SHADOW * melted;
    var rest = 0.0;
    if (firm > 0.0) {
      rest = restShadow(liquid, page, d, spread) * firm;
    }
    let shadow = (1.0 - (1.0 - contact) * (1.0 - rest)) * (1.0 - coverage) * shown;
    acc = over(vec4f(0.0, 0.0, 0.0, shadow), acc);

    if (coverage > 0.0) {
      // The solid part is the rest shape, so that the field's bumps do not
      // show in it: about the rest place while the body is calm, and about
      // the centre of the body's mass once it moves, so the melt moves with
      // it.
      let solidCentre = mix(liquid.rest.yz, vec2f(liquid.rest.x, 0.0), liquid.calm);
      let toCentre = page - (liquid.origin + solidCentre);
      let toCore = vec2f(max(abs(toCentre.x) - liquid.rest.w, 0.0), toCentre.y);
      let inward = saturate(1.0 - length(toCore) / (liquid.radius + spread));
      let solid = solidAt(inward, firm);
      var above = 0.0;
      if (solid > 0.0 && liquid.edge.w > 0.0) {
        above = liquidSurface(liquid, page - vec2f(0.0, 1.0), spread).surface.distance;
      }
      let body = lens(liquid, track, page, surface, found.radius, solid, solidBody(liquid, d, above));
      var layer = vec4f(body, 1.0);
      if (seeThrough) {
        // The liquid shows over the track as it is, and lets as much of the
        // page through as it can. Where it is lighter than the track it only
        // adds light, so a label under it keeps its contrast.
        let under = trackAt(liquid, track, page);
        let ratio = body / max(under, vec3f(1e-3));
        let through = min(1.0, min(ratio.x, min(ratio.y, ratio.z)));
        layer = vec4f(body - under * through, 1.0 - through);
      }
      acc = over(layer * coverage * shown, acc);
    }
  }

  if (edgeLit > 0.0 && d < 4.0) {
    let facing = dot(surface.outward, liquid.light.xy);
    acc = litEdge(acc, d, saturate(facing), saturate(-facing), (liquid.flags & FLAG_LIGHT_BODY) != 0u, edgeLit);
  }
  return acc;
}
`;

/**
 * The byte size of one `LiquidInstance`.
 *
 * @internal
 */
export const LIQUID_INSTANCE_BYTES = 240;

const INSTANCE_WORDS = LIQUID_INSTANCE_BYTES / 4;

/**
 * Packs the instances in order as `LiquidInstance` structs at the start of
 * `buffer`, which must hold at least that many.
 *
 * @internal
 */
export function packLiquidInstances(
  instances: readonly LiquidInstance[],
  buffer: ArrayBuffer,
) {
  const floats = new Float32Array(buffer);
  const words = new Uint32Array(buffer);
  for (const [index, liquid] of instances.entries()) {
    const at = index * INSTANCE_WORDS;
    words.fill(0, at, at + INSTANCE_WORDS);
    words[at] = liquid.elementIndex;
    words[at + 1] = liquid.slot;
    words[at + 2] = liquid.particleCount;
    words[at + 3] = liquid.firstBead;
    words[at + 4] = liquid.beadCount;
    words[at + 5] =
      (liquid.cover ? FLAG_COVER : 0) |
      (liquid.seeThrough ? FLAG_SEE_THROUGH : 0) |
      (liquid.lightBody ? FLAG_LIGHT_BODY : 0) |
      (liquid.room ? FLAG_ROOM : 0);
    floats[at + 6] = liquid.radius;
    floats[at + 7] = liquid.calm;
    floats.set(
      [liquid.originX, liquid.originY, liquid.body, liquid.edgeLit],
      at + 8,
    );
    floats.set([...liquid.thumb, liquid.set], at + 12);
    floats.set([...liquid.off, liquid.rise], at + 16);
    floats.set([...liquid.on, liquid.riseGoal], at + 20);
    floats.set([...liquid.backdrop, liquid.spread], at + 24);
    floats.set(
      [liquid.restX, liquid.centreX, liquid.centreY, liquid.span],
      at + 28,
    );
    floats.set([...liquid.light, liquid.scale, liquid.ring.width], at + 32);
    floats.set(liquid.edge, at + 36);
    floats.set(liquid.ring.off, at + 40);
    floats.set(liquid.ring.on, at + 44);
    if (liquid.corner !== undefined) {
      floats.set([liquid.corner.radius, liquid.corner.exponent], at + 48);
    }
    floats.set([liquid.restRadius, liquid.restSpan], at + 50);
    floats.set(liquid.leaving, at + 52);
    if (liquid.surface !== undefined) {
      floats.set([liquid.surface.edge, ...liquid.surface.above], at + 56);
    }
  }
}

/**
 * Packs the beads as `Bead` structs at the start of `buffer`.
 *
 * @internal
 */
export function packLiquidBeads(
  beads: readonly LiquidBeadInstance[],
  buffer: ArrayBuffer,
) {
  const floats = new Float32Array(buffer);
  for (const [index, bead] of beads.entries()) {
    floats.set([bead.x, bead.y, bead.radius, 0], index * 4);
  }
}
