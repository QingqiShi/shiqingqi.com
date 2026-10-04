import type { Band } from "./compute-bands.ts";
import { GPU_BUFFER_USAGE, PREMULTIPLIED_BLEND } from "./constants.ts";
import { TARGET_WGSL } from "./target-wgsl.ts";
import type { Effect, EffectFrame } from "./types.ts";

const SLOT_COLORS = [
  [0.86, 0.16, 0.55],
  [0, 0.6, 0.86],
] as const;
const MARKER_COLOR = [0.5, 0.5, 0.5] as const;
const DOCUMENT_ELEMENT_COLOR = [0.1, 0.7, 0.2] as const;
const FIXED_ELEMENT_COLOR = [1, 0.5, 0] as const;
const POINTER_COLOR = [0.9, 0.1, 0.2] as const;

/**
 * The event the debug view dispatches on `window` each frame it draws, with
 * the measured elements and the pointer, for tests and for the console.
 */
const FRAME_EVENT = "effectlayerframe";
/** Below this pointer speed, in CSS px per second, the velocity line is gone. */
const STILL_VELOCITY = 5;

// Rows of a 3 x 5 glyph, top first.
const DIGIT_GLYPHS = [
  0b111_101_101_101_111, 0b010_110_010_010_111, 0b111_001_111_100_111,
  0b111_001_111_001_111, 0b101_101_111_001_001, 0b111_100_111_001_111,
  0b111_100_111_101_111, 0b111_001_001_001_001, 0b111_101_111_101_111,
  0b111_101_111_001_111,
];

// The track, two placed bands, two drawn parts and the viewport.
const MAX_RECTS = 6;
const RECT_FLOATS = 8;

const vec3 = (color: readonly number[]) => `vec3f(${color.join(", ")})`;

const BAND_WGSL = /* wgsl */ `${TARGET_WGSL}
const EDGE_STRIP = 8.0;

struct BandVarying {
  @builtin(position) position: vec4f,
  @location(0) @interpolate(flat) index: u32,
}

var<private> digitGlyphs: array<u32, 10> = array<u32, 10>(${DIGIT_GLYPHS.map((glyph) => `${String(glyph)}u`).join(", ")});

@vertex
fn vertexMain(
  @builtin(vertex_index) vertex: u32,
  @builtin(instance_index) index: u32,
) -> BandVarying {
  let corner = vec2f(f32((vertex << 1u) & 2u), f32(vertex & 2u));
  return BandVarying(vec4f(corner * 2.0 - 1.0, 0.0, 1.0), index);
}

fn isDigitCell(cell: vec2u, value: u32) -> bool {
  var digitCount = 1u;
  var rest = value / 10u;
  while (rest > 0u) {
    digitCount += 1u;
    rest /= 10u;
  }
  let glyph = cell.x / 4u;
  let column = cell.x % 4u;
  if (glyph >= digitCount || column == 3u || cell.y >= 5u) {
    return false;
  }
  var place = 1u;
  for (var i = glyph + 1u; i < digitCount; i += 1u) {
    place *= 10u;
  }
  let digit = (value / place) % 10u;
  let bit = 14u - (cell.y * 3u + column);
  return ((digitGlyphs[digit] >> bit) & 1u) == 1u;
}

@fragment
fn fragmentMain(input: BandVarying) -> @location(0) vec4f {
  let page = fragmentToPage(input.position.xy);
  let top = effectTarget.pageOffset.y;
  let drawn = effectTarget.drawnPageRange;
  let label = (page - effectTarget.pageOffset - vec2f(EDGE_STRIP + 4.0, 8.0)) / 3.0;
  let color = select(${vec3(SLOT_COLORS[0])}, ${vec3(SLOT_COLORS[1])}, input.index % 2u == 1u);

  let left = page.x - effectTarget.pageOffset.x;
  let right = effectTarget.cssSize.x - left;
  var alpha = 0.0;
  if (min(left, right) < EDGE_STRIP) {
    alpha = select(0.35, 0.6, fract((page.x + page.y) / 32.0) < 0.5);
  }
  if (page.y - top < 4.0) {
    alpha = 0.9;
  }
  if ((page.y - drawn.x < 3.0 || drawn.y - page.y < 3.0) && fract(page.x / 24.0) < 0.5) {
    alpha = 1.0;
  }
  if (label.x >= 0.0 && label.y >= 0.0 && isDigitCell(vec2u(label), input.index)) {
    alpha = 0.9;
  }
  return vec4f(color * alpha, alpha);
}
`;

const ELEMENT_WGSL = /* wgsl */ `${TARGET_WGSL}
// A line on the edge, then a band of the measured fill over a checkerboard,
// so a translucent fill shows as translucent.
const MARGIN = 12.0;
const LINE_WIDTH = 2.0;
const FILL_START = 4.0;
const FILL_END = 10.0;
const POINTER_RING = 10.0;
const VELOCITY_SECONDS = 0.1;

struct ElementVarying {
  @builtin(position) position: vec4f,
  @location(0) @interpolate(flat) index: u32,
}

@vertex
fn elementVertex(
  @builtin(vertex_index) vertex: u32,
  @builtin(instance_index) index: u32,
) -> ElementVarying {
  let element = effectElements[index];
  let corner = vec2f(f32(vertex & 1u), f32((vertex >> 1u) & 1u));
  let page = element.rect.xy - MARGIN + corner * (element.rect.zw + 2.0 * MARGIN);
  return ElementVarying(pageToClip(page), index);
}

@fragment
fn elementFragment(input: ElementVarying) -> @location(0) vec4f {
  let element = effectElements[input.index];
  let page = fragmentToPage(input.position.xy);
  let edge = effectElementDistance(element, page);
  if (edge >= 0.0 && edge < LINE_WIDTH) {
    let fixed = (element.flags & EFFECT_ELEMENT_FIXED) != 0u;
    return vec4f(select(${vec3(DOCUMENT_ELEMENT_COLOR)}, ${vec3(FIXED_ELEMENT_COLOR)}, fixed), 1.0);
  }
  if (edge >= FILL_START && edge < FILL_END) {
    let cell = vec2i(floor(page / 4.0));
    let checker = select(0.55, 0.8, ((cell.x + cell.y) & 1) == 1);
    return vec4f(mix(vec3f(checker), element.fill.rgb, element.fill.a), 1.0);
  }
  return vec4f(0.0);
}

@vertex
fn pointerVertex(@builtin(vertex_index) vertex: u32) -> @builtin(position) vec4f {
  let start = effectPage.pointerPosition;
  let end = start + effectPage.pointerVelocity * VELOCITY_SECONDS;
  let corner = vec2f(f32(vertex & 1u), f32((vertex >> 1u) & 1u));
  return pageToClip(mix(min(start, end) - 16.0, max(start, end) + 16.0, corner));
}

@fragment
fn pointerFragment(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let offset = fragmentToPage(position.xy) - effectPage.pointerPosition;
  let radius = length(offset);
  let velocity = effectPage.pointerVelocity * VELOCITY_SECONDS;
  let along = clamp(dot(offset, velocity) / max(dot(velocity, velocity), 1e-6), 0.0, 1.0);
  let fromLine = length(offset - velocity * along);
  let pressed = (effectPage.pointerFlags & EFFECT_POINTER_PRESSED) != 0u;
  if (abs(radius - POINTER_RING) < 1.0 ||
      (pressed && radius < POINTER_RING - 4.0) ||
      (radius > POINTER_RING && fromLine < 1.0)) {
    return vec4f(${vec3(POINTER_COLOR)}, 1.0);
  }
  return vec4f(0.0);
}
`;

const RECT_WGSL = /* wgsl */ `${TARGET_WGSL}
struct RectVarying {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertex: u32,
  @location(0) rect: vec4f,
  @location(1) color: vec4f,
) -> RectVarying {
  let corner = vec2f(f32(vertex & 1u), f32((vertex >> 1u) & 1u));
  let page = effectTarget.pageOffset + rect.xy + corner * rect.zw;
  return RectVarying(pageToClip(page), color);
}

@fragment
fn fragmentMain(input: RectVarying) -> @location(0) vec4f {
  return vec4f(input.color.rgb * input.color.a, input.color.a);
}
`;

/**
 * Writes the minimap at the right edge of the viewport into `rects` and
 * returns how many it wrote: the document as a track, the band each scroll
 * `<canvas>` element sits on, the part of it drawn this frame, and the
 * viewport beside them.
 */
function writeMinimap(
  rects: Float32Array,
  frame: EffectFrame,
  layerTop: number,
  placed: readonly (Band | null)[],
): number {
  const { width, height } = frame.viewport;
  const trackTop = 96;
  const trackHeight = height - 2 * trackTop;
  if (trackHeight <= 0 || frame.documentHeight <= 0) {
    return 0;
  }
  const trackLeft = width - 28;
  const scale = trackHeight / frame.documentHeight;
  let count = 0;
  const write = (
    x: number,
    top: number,
    rectWidth: number,
    rectHeight: number,
    color: readonly number[],
    alpha: number,
  ) => {
    rects.set(
      [
        x,
        trackTop + top * scale,
        rectWidth,
        rectHeight * scale,
        ...color,
        alpha,
      ],
      count * RECT_FLOATS,
    );
    count += 1;
  };

  write(trackLeft, 0, 12, frame.documentHeight, MARKER_COLOR, 0.2);
  for (const band of placed) {
    if (band !== null) {
      write(trackLeft, band.top, 12, band.height, SLOT_COLORS[band.slot], 0.35);
    }
  }
  for (const { band } of frame.targets) {
    if (band !== null) {
      write(
        trackLeft + 3,
        band.top + band.drawnTop,
        6,
        band.drawnHeight,
        SLOT_COLORS[band.slot],
        1,
      );
    }
  }
  write(
    trackLeft - 6,
    frame.viewport.y - layerTop,
    3,
    height,
    MARKER_COLOR,
    0.9,
  );
  return count;
}

/**
 * The debug view, `?effects=debug`. Each band gets a strip down each side in
 * its slot's colour (slot 0 magenta, slot 1 cyan), a line on its top edge
 * with its index under it, stripes in page space that must join across
 * bands, and dashed lines where the part drawn this frame ends. The page
 * between the strips stays clear, so that the content under it stays
 * readable. Each registered element gets a line on its
 * edge (green in the document, orange when fixed) and a band of its measured
 * fill. The fixed `<canvas>` element shows the minimap and the pointer: a
 * ring, filled while pressed, with a line for its velocity.
 *
 * @internal
 */
export const debugEffect: Effect = {
  async setup({ device, format, pageLayout, targetLayout }) {
    const layout = device.createPipelineLayout({
      bindGroupLayouts: [pageLayout, targetLayout],
    });
    const bandModule = device.createShaderModule({ code: BAND_WGSL });
    const rectModule = device.createShaderModule({ code: RECT_WGSL });
    const elementModule = device.createShaderModule({ code: ELEMENT_WGSL });
    const strip = (vertex: string, fragment: string) =>
      device.createRenderPipelineAsync({
        layout,
        vertex: { module: elementModule, entryPoint: vertex },
        fragment: {
          module: elementModule,
          entryPoint: fragment,
          targets: [{ format, blend: PREMULTIPLIED_BLEND }],
        },
        primitive: { topology: "triangle-strip" },
      });
    const [bandPipeline, rectPipeline, elementPipeline, pointerPipeline] =
      await Promise.all([
        device.createRenderPipelineAsync({
          layout,
          vertex: { module: bandModule, entryPoint: "vertexMain" },
          fragment: {
            module: bandModule,
            entryPoint: "fragmentMain",
            targets: [{ format, blend: PREMULTIPLIED_BLEND }],
          },
        }),
        device.createRenderPipelineAsync({
          layout,
          vertex: {
            module: rectModule,
            entryPoint: "vertexMain",
            buffers: [
              {
                arrayStride: RECT_FLOATS * 4,
                stepMode: "instance",
                attributes: [
                  { shaderLocation: 0, offset: 0, format: "float32x4" },
                  { shaderLocation: 1, offset: 16, format: "float32x4" },
                ],
              },
            ],
          },
          fragment: {
            module: rectModule,
            entryPoint: "fragmentMain",
            targets: [{ format, blend: PREMULTIPLIED_BLEND }],
          },
          primitive: { topology: "triangle-strip" },
        }),
        strip("elementVertex", "elementFragment"),
        strip("pointerVertex", "pointerFragment"),
      ]);
    const rects = new Float32Array(MAX_RECTS * RECT_FLOATS);
    const rectBuffer = device.createBuffer({
      size: rects.byteLength,
      usage: GPU_BUFFER_USAGE.VERTEX | GPU_BUFFER_USAGE.COPY_DST,
    });

    const placed: (Band | null)[] = [null, null];
    let layerTop = 0;

    return {
      followsPointer: true,
      update(_encoder, frame) {
        for (const { band, y } of frame.targets) {
          if (band !== null) {
            placed[band.slot] = band;
            layerTop = y - band.top;
          }
        }
        window.dispatchEvent(
          new CustomEvent(FRAME_EVENT, {
            detail: {
              scrollX: frame.viewport.x,
              scrollY: frame.viewport.y,
              elements: frame.elements,
              pointer: frame.pointer,
            },
          }),
        );
        const { velocityX, velocityY } = frame.pointer;
        return Math.hypot(velocityX, velocityY) > STILL_VELOCITY;
      },
      draw(pass, target, frame) {
        if (target.band !== null) {
          pass.setPipeline(bandPipeline);
          pass.draw(3, 1, 0, target.band.index);
        } else {
          const count = writeMinimap(rects, frame, layerTop, placed);
          device.queue.writeBuffer(rectBuffer, 0, rects);
          pass.setPipeline(rectPipeline);
          pass.setVertexBuffer(0, rectBuffer);
          pass.draw(4, count);
        }
        if (target.elementCount > 0) {
          pass.setPipeline(elementPipeline);
          pass.draw(4, target.elementCount, 0, target.firstElement);
        }
        if (target.canvas === "fixed" && frame.pointer.present) {
          pass.setPipeline(pointerPipeline);
          pass.draw(4);
        }
      },
      destroy() {
        rectBuffer.destroy();
      },
    };
  },
};
