import { debugBandWgsl } from "../_generated/wgsl/debug-band.ts";
import { debugElementWgsl } from "../_generated/wgsl/debug-element.ts";
import { debugPointerWgsl } from "../_generated/wgsl/debug-pointer.ts";
import { debugRectWgsl } from "../_generated/wgsl/debug-rect.ts";
import { DebugRect, debugLayout } from "../_generated/wgsl/layouts.ts";
import { compileEffectShader } from "./compile-effect-shader.ts";
import type { Band } from "./compute-bands.ts";
import { createBindGroup } from "./create-binding.ts";
import { QUAD_STRIP } from "./create-instanced-draw.ts";
import { createStorageBuffer } from "./create-storage-buffer.ts";
import { DEBUG_COLORS, MAX_RECTS } from "./debug-colors.ts";
import type { DebugRect as DebugRectSchema } from "./debug-layout.ts";
import type { Effect, EffectFrame, EffectInput } from "./types.ts";

/**
 * The event the debug view dispatches on `window` each frame it draws, with
 * the measured elements and the pointer, for tests and for the console.
 */
const FRAME_EVENT = "effectlayerframe";
/** Below this pointer speed, in CSS px per second, the velocity line is gone. */
const STILL_VELOCITY = 5;

type RectValue = EffectInput<typeof DebugRectSchema>;
const NO_RECT: RectValue = { rect: [0, 0, 0, 0], color: [0, 0, 0, 0] };

/**
 * The rects of the minimap at the right edge of the viewport: the document
 * as a track, the band each scroll `<canvas>` element of the page sits on,
 * the part of it drawn this frame, and the viewport beside them.
 */
function minimapRects(
  frame: EffectFrame,
  layerTop: number,
  placed: readonly (Band | null)[],
): RectValue[] {
  const { width, height } = frame.viewport;
  const trackTop = 96;
  const trackHeight = height - 2 * trackTop;
  if (trackHeight <= 0 || frame.documentHeight <= 0) {
    return [];
  }
  const trackLeft = width - 28;
  const scale = trackHeight / frame.documentHeight;
  const rects: RectValue[] = [];
  const add = (
    x: number,
    top: number,
    rectWidth: number,
    rectHeight: number,
    [red, green, blue]: readonly [number, number, number],
    alpha: number,
  ) => {
    rects.push({
      rect: [x, trackTop + top * scale, rectWidth, rectHeight * scale],
      color: [red, green, blue, alpha],
    });
  };

  add(trackLeft, 0, 12, frame.documentHeight, DEBUG_COLORS.marker, 0.2);
  for (const band of placed) {
    if (band !== null) {
      add(
        trackLeft,
        band.top,
        12,
        band.height,
        DEBUG_COLORS.slots[band.slot],
        0.35,
      );
    }
  }
  for (const { carrier, band } of frame.targets) {
    if (frame.carriers[carrier] === "page" && band !== null) {
      add(
        trackLeft + 3,
        band.top + band.drawnTop,
        6,
        band.drawnHeight,
        DEBUG_COLORS.slots[band.slot],
        1,
      );
    }
  }
  add(
    trackLeft - 6,
    frame.viewport.y - layerTop,
    3,
    height,
    DEBUG_COLORS.marker,
    0.9,
  );
  return rects;
}

/**
 * The debug view, `?effects=debug`. Each band gets a strip down each side in
 * its slot's colour (slot 0 magenta, slot 1 cyan), a line on its top edge
 * with its index under it, stripes in page space that must join across
 * bands, and dashed lines where the part drawn this frame ends. The page
 * between the strips stays clear, so that the content under it stays
 * readable. Each registered element gets a line on its
 * edge (green in the document, orange when fixed, violet for an Effect
 * container) and a band of its measured fill, clipped to its Effect
 * container. Inside each Effect container, a dashed violet line runs round
 * its edge, with the id of its scope under the top-left corner. The fixed
 * `<canvas>` element shows the minimap and the pointer: a ring, filled while
 * pressed, with a line for its velocity.
 *
 * @internal
 */
export const debugEffect: Effect = {
  async setup({ device, colorTarget }) {
    const [bandPipeline, rectPipeline, elementPipeline, pointerPipeline] =
      await Promise.all([
        compileEffectShader(device, debugBandWgsl).render(colorTarget),
        ...[debugRectWgsl, debugElementWgsl, debugPointerWgsl].map((shader) =>
          compileEffectShader(device, shader).render(colorTarget, QUAD_STRIP),
        ),
      ]);
    const rectBuffer = createStorageBuffer(device, DebugRect, MAX_RECTS);
    const rectBindGroup = createBindGroup(device, debugLayout, {
      rects: rectBuffer,
    });
    const rectValues: RectValue[] = [];

    const placed: (Band | null)[] = [null, null];
    let layerTop = 0;

    return {
      followsPointer: true,
      update(_encoder, frame) {
        for (const { carrier, band, y } of frame.targets) {
          if (frame.carriers[carrier] === "page" && band !== null) {
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
          pass.draw(bandPipeline, null, 3, 1, 0, target.band.index);
        } else if (frame.carriers[target.carrier] === "fixed") {
          const rects = minimapRects(frame, layerTop, placed);
          for (let index = 0; index < MAX_RECTS; index++) {
            rectValues[index] = rects.at(index) ?? NO_RECT;
          }
          rectBuffer.write(rectValues);
          pass.draw(rectPipeline, rectBindGroup, 4, rects.length);
        }
        pass.draw(
          elementPipeline,
          null,
          4,
          target.elementCount,
          0,
          target.firstElement,
        );
        if (
          frame.carriers[target.carrier] === "fixed" &&
          frame.pointer.present
        ) {
          pass.draw(pointerPipeline, null, 4);
        }
      },
      destroy() {
        rectBuffer.destroy();
      },
    };
  },
};
