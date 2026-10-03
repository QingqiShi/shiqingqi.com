import type { Band } from "./compute-bands.ts";
import { GPU_BUFFER_USAGE } from "./constants.ts";
import { TARGET_WGSL } from "./target-wgsl.ts";
import type { Effect, EffectFrame } from "./types.ts";

const SLOT_COLORS = [
  [0.86, 0.16, 0.55],
  [0, 0.6, 0.86],
] as const;
const MARKER_COLOR = [0.5, 0.5, 0.5] as const;

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

const BLEND: GPUBlendState = {
  color: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
  alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
};

const vec3 = (color: readonly number[]) => `vec3f(${color.join(", ")})`;

const BAND_WGSL = /* wgsl */ `${TARGET_WGSL}
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
  let label = (page - effectTarget.pageOffset - vec2f(16.0)) / 6.0;
  let color = select(${vec3(SLOT_COLORS[0])}, ${vec3(SLOT_COLORS[1])}, input.index % 2u == 1u);

  var alpha = 0.1;
  if (fract((page.x + page.y) / 32.0) < 0.5) {
    alpha = 0.18;
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
 * The debug view, `?effects=debug`. Each band gets a fill in its slot's
 * colour (slot 0 magenta, slot 1 cyan) with its index at its top edge,
 * stripes in page space that must join across bands, and dashed lines where
 * the part drawn this frame ends. The fixed `<canvas>` element shows the
 * minimap.
 *
 * @internal
 */
export const debugEffect: Effect = {
  async setup({ device, format, targetLayout }) {
    const layout = device.createPipelineLayout({
      bindGroupLayouts: [targetLayout],
    });
    const bandModule = device.createShaderModule({ code: BAND_WGSL });
    const rectModule = device.createShaderModule({ code: RECT_WGSL });
    const [bandPipeline, rectPipeline] = await Promise.all([
      device.createRenderPipelineAsync({
        layout,
        vertex: { module: bandModule, entryPoint: "vertexMain" },
        fragment: {
          module: bandModule,
          entryPoint: "fragmentMain",
          targets: [{ format, blend: BLEND }],
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
          targets: [{ format, blend: BLEND }],
        },
        primitive: { topology: "triangle-strip" },
      }),
    ]);
    const rects = new Float32Array(MAX_RECTS * RECT_FLOATS);
    const rectBuffer = device.createBuffer({
      size: rects.byteLength,
      usage: GPU_BUFFER_USAGE.VERTEX | GPU_BUFFER_USAGE.COPY_DST,
    });

    const placed: (Band | null)[] = [null, null];
    let layerTop = 0;

    return {
      update(_encoder, frame) {
        for (const { band, y } of frame.targets) {
          if (band !== null) {
            placed[band.slot] = band;
            layerTop = y - band.top;
          }
        }
        return false;
      },
      draw(pass, target, frame) {
        pass.setBindGroup(0, target.bindGroup);
        if (target.band !== null) {
          pass.setPipeline(bandPipeline);
          pass.draw(3, 1, 0, target.band.index);
          return;
        }
        const count = writeMinimap(rects, frame, layerTop, placed);
        device.queue.writeBuffer(rectBuffer, 0, rects);
        pass.setPipeline(rectPipeline);
        pass.setVertexBuffer(0, rectBuffer);
        pass.draw(4, count);
      },
      destroy() {
        rectBuffer.destroy();
      },
    };
  },
};
