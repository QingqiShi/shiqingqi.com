import { d, std, tgpu } from "typegpu";
import { DEBUG_COLORS, type Rgb } from "./debug-colors.ts";
import { debugLayout } from "./debug-layout.ts";
import { effectClip } from "./effect-clip.ts";
import { effectElementDistance } from "./effect-element-distance.ts";
import { ELEMENT_FIXED, POINTER_PRESSED } from "./effect-page-value.ts";
import {
  elementQuad,
  fragmentToPage,
  instancedQuadIn,
  instancedQuadVarying,
  pageToClip,
  stripCorner,
} from "./element-quad.ts";
import { pageLayout } from "./page-layout.ts";
import { PAGE_SCOPE } from "./plan-scopes.ts";
import { targetLayout } from "./target-layout.ts";

const vec3 = ([red, green, blue]: Rgb) => d.vec3f(red, green, blue);
const EVEN_SLOT_COLOR = vec3(DEBUG_COLORS.slots[0]);
const ODD_SLOT_COLOR = vec3(DEBUG_COLORS.slots[1]);
const DOCUMENT_ELEMENT_COLOR = vec3(DEBUG_COLORS.documentElement);
const FIXED_ELEMENT_COLOR = vec3(DEBUG_COLORS.fixedElement);
const CONTAINER_COLOR = vec3(DEBUG_COLORS.container);
const POINTER_COLOR = vec3(DEBUG_COLORS.pointer);

// Rows of a 3 x 5 glyph, top first.
const digitGlyphs = tgpu.const(
  d.arrayOf(d.u32, 10),
  [
    0b111_101_101_101_111, 0b010_110_010_010_111, 0b111_001_111_100_111,
    0b111_001_111_001_111, 0b101_101_111_001_001, 0b111_100_111_001_111,
    0b111_100_111_101_111, 0b111_001_001_001_001, 0b111_101_111_101_111,
    0b111_101_111_001_111,
  ],
);

/** Whether `cell` of the glyphs of `value`, 4 cells apart, is lit. */
const isDigitCell = tgpu.fn(
  [d.vec2u, d.u32],
  d.bool,
)((cell, value) => {
  "use gpu";
  let digitCount = d.u32(1);
  let rest = std.intdiv(value, 10);
  while (rest > 0) {
    digitCount += 1;
    rest = std.intdiv(rest, 10);
  }
  const glyph = std.intdiv(cell.x, 4);
  const column = cell.x % 4;
  if (glyph >= digitCount || column === 3 || cell.y >= 5) {
    return false;
  }
  let place = d.u32(1);
  for (let i = glyph + 1; i < digitCount; i += 1) {
    place *= 10;
  }
  const digit = std.intdiv(value, place) % 10;
  const bit = 14 - (cell.y * 3 + column);
  return ((digitGlyphs.$[digit] >>> bit) & 1) === 1;
});

const EDGE_STRIP = 8;

const bandVertex = tgpu.vertexFn({
  in: { vertex: d.builtin.vertexIndex, index: d.builtin.instanceIndex },
  out: { position: d.builtin.position, index: d.interpolate("flat", d.u32) },
})((input) => {
  "use gpu";
  const corner = d.vec2f(
    d.f32((input.vertex << 1) & 2),
    d.f32(input.vertex & 2),
  );
  return {
    position: d.vec4f(corner.mul(2).sub(1), 0, 1),
    index: input.index,
  };
});

const bandFragment = tgpu.fragmentFn({
  in: { position: d.builtin.position, index: d.interpolate("flat", d.u32) },
  out: d.vec4f,
})((input) => {
  "use gpu";
  const target = targetLayout.$.effectTarget;
  const page = fragmentToPage(input.position.xy);
  const top = target.pageOffset.y;
  const drawn = target.drawnPageRange;
  const label = page
    .sub(target.pageOffset)
    .sub(d.vec2f(EDGE_STRIP + 4, 8))
    .div(3);
  const color = std.select(
    EVEN_SLOT_COLOR,
    ODD_SLOT_COLOR,
    input.index % 2 === 1,
  );

  const left = page.x - target.pageOffset.x;
  const right = target.cssSize.x - left;
  let alpha = d.f32(0);
  if (std.min(left, right) < EDGE_STRIP) {
    alpha = std.select(
      d.f32(0.35),
      d.f32(0.6),
      std.fract((page.x + page.y) / 32) < 0.5,
    );
  }
  if (page.y - top < 4) {
    alpha = 0.9;
  }
  if (
    (page.y - drawn.x < 3 || drawn.y - page.y < 3) &&
    std.fract(page.x / 24) < 0.5
  ) {
    alpha = 1;
  }
  if (
    label.x >= 0 &&
    label.y >= 0 &&
    isDigitCell(d.vec2u(label), input.index)
  ) {
    alpha = 0.9;
  }
  return d.vec4f(color.mul(alpha), alpha);
});

const rectVertex = tgpu.vertexFn({
  in: { vertex: d.builtin.vertexIndex, instance: d.builtin.instanceIndex },
  out: { position: d.builtin.position, color: d.vec4f },
})((input) => {
  "use gpu";
  const rect = debugLayout.$.rects[input.instance];
  const page = targetLayout.$.effectTarget.pageOffset
    .add(rect.rect.xy)
    .add(stripCorner(input.vertex).mul(rect.rect.zw));
  return { position: pageToClip(page), color: rect.color };
});

const rectFragment = tgpu.fragmentFn({
  in: { color: d.vec4f },
  out: d.vec4f,
})((input) => {
  "use gpu";
  return d.vec4f(input.color.xyz.mul(input.color.w), input.color.w);
});

// A line on the edge, then a band of the measured fill over a checkerboard,
// so a translucent fill shows as translucent. An Effect container also gets
// a dashed line inside its edge and the id of its scope under the top-left
// corner.
const MARGIN = 12;
const LINE_WIDTH = 2;
const FILL_START = 4;
const FILL_END = 10;
const POINTER_RING = 10;
const VELOCITY_SECONDS = 0.1;
const LABEL_INSET = 12;

const elementVertex = tgpu.vertexFn({
  in: instancedQuadIn,
  out: instancedQuadVarying,
})((input) => {
  "use gpu";
  return {
    position: elementQuad(
      input.vertex,
      pageLayout.$.effectElements[input.instance],
      MARGIN,
    ),
    instance: input.instance,
  };
});

const elementFragment = tgpu.fragmentFn({
  in: instancedQuadVarying,
  out: d.vec4f,
})((input) => {
  "use gpu";
  const element = pageLayout.$.effectElements[input.instance];
  const page = fragmentToPage(input.position.xy);
  const edge = effectElementDistance(element, page);
  const clip = effectClip(element.scope, page);
  let held = d.u32(PAGE_SCOPE);
  for (
    let scope = d.u32(1);
    scope < pageLayout.$.effectPage.scopeCount;
    scope += 1
  ) {
    if (pageLayout.$.effectScopes[scope].container === input.instance) {
      held = scope;
    }
  }
  const isContainer = held !== PAGE_SCOPE;
  if (isContainer) {
    const label = page.sub(element.rect.xy).sub(LABEL_INSET).div(2);
    const dashed =
      edge < -LINE_WIDTH &&
      edge >= -2 * LINE_WIDTH &&
      std.fract((page.x + page.y) / 12) < 0.5;
    if (
      dashed ||
      (label.x >= 0 &&
        label.y >= 0 &&
        isDigitCell(d.vec2u(label), pageLayout.$.effectScopes[held].id))
    ) {
      return d.vec4f(CONTAINER_COLOR, 1).mul(clip);
    }
  }
  if (edge >= 0 && edge < LINE_WIDTH) {
    const fixed = (element.flags & ELEMENT_FIXED) !== 0;
    let line = std.select(DOCUMENT_ELEMENT_COLOR, FIXED_ELEMENT_COLOR, fixed);
    if (isContainer) {
      line = d.vec3f(CONTAINER_COLOR);
    }
    return d.vec4f(line, 1).mul(clip);
  }
  if (edge >= FILL_START && edge < FILL_END) {
    const cell = d.vec2i(std.floor(page.div(4)));
    const checker = std.select(
      d.f32(0.55),
      d.f32(0.8),
      ((cell.x + cell.y) & 1) === 1,
    );
    return d
      .vec4f(std.mix(d.vec3f(checker), element.fill.xyz, element.fill.w), 1)
      .mul(clip);
  }
  return d.vec4f(0);
});

const pointerVertex = tgpu.vertexFn({
  in: { vertex: d.builtin.vertexIndex },
  out: { position: d.builtin.position },
})((input) => {
  "use gpu";
  const start = pageLayout.$.effectPage.pointerPosition;
  const end = start.add(
    pageLayout.$.effectPage.pointerVelocity.mul(VELOCITY_SECONDS),
  );
  return {
    position: pageToClip(
      std.mix(
        std.min(start, end).sub(16),
        std.max(start, end).add(16),
        stripCorner(input.vertex),
      ),
    ),
  };
});

const pointerFragment = tgpu.fragmentFn({
  in: { position: d.builtin.position },
  out: d.vec4f,
})((input) => {
  "use gpu";
  const offset = fragmentToPage(input.position.xy).sub(
    pageLayout.$.effectPage.pointerPosition,
  );
  const radius = std.length(offset);
  const velocity =
    pageLayout.$.effectPage.pointerVelocity.mul(VELOCITY_SECONDS);
  const along = std.clamp(
    std.dot(offset, velocity) / std.max(std.dot(velocity, velocity), 1e-6),
    0,
    1,
  );
  const fromLine = std.length(offset.sub(velocity.mul(along)));
  const pressed =
    (pageLayout.$.effectPage.pointerFlags & POINTER_PRESSED) !== 0;
  if (
    std.abs(radius - POINTER_RING) < 1 ||
    (pressed && radius < POINTER_RING - 4) ||
    (radius > POINTER_RING && fromLine < 1)
  ) {
    return d.vec4f(POINTER_COLOR, 1);
  }
  return d.vec4f(0);
});

/**
 * The render shaders of the debug view.
 *
 * - `band` draws each band: a strip down each side in its slot's colour, a
 *   line on its top edge with its index under it, stripes in page space
 *   that must join across bands, and dashed lines where the part drawn this
 *   frame ends. It is one triangle over the target, with the band's index
 *   as the instance.
 * - `rect` draws the minimap: one quad for each entry of `rects`.
 * - `element` draws each registered element: one quad around it, with its
 *   index in `effectElements` as the instance.
 * - `pointer` draws the pointer: a ring, filled while pressed, with a line
 *   for its velocity.
 *
 * @internal
 */
export const debugShader = {
  band: { vertex: bandVertex, fragment: bandFragment },
  rect: { vertex: rectVertex, fragment: rectFragment },
  element: { vertex: elementVertex, fragment: elementFragment },
  pointer: { vertex: pointerVertex, fragment: pointerFragment },
};
