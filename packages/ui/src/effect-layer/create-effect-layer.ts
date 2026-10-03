import { REDUCED_MOTION_QUERY } from "../prefers-reduced-motion.ts";
import {
  bandGeometry,
  bandScissorRect,
  computeBands,
  type ScissorRect,
} from "./compute-bands.ts";
import { GPU_BUFFER_USAGE, GPU_SHADER_STAGE } from "./constants.ts";
import type { EffectDevice } from "./request-effect-device.ts";
import { packTargetUniform, TARGET_UNIFORM_BYTES } from "./target-wgsl.ts";
import type {
  Effect,
  EffectFrame,
  EffectRenderer,
  EffectSetup,
  EffectTarget,
} from "./types.ts";

const MAX_PIXEL_RATIO = 2;
const MAX_DELTA_SECONDS = 0.1;

interface ConfiguredCanvas {
  readonly canvas: HTMLCanvasElement;
  readonly context: GPUCanvasContext;
  readonly uniform: GPUBuffer;
  readonly bindGroup: GPUBindGroup;
}

interface ScrollCanvas extends ConfiguredCanvas {
  /** The band the `<canvas>` element sits on, kept while it is out of range. */
  bandIndex: number | null;
}

interface Pass {
  readonly configured: ConfiguredCanvas;
  readonly target: EffectTarget;
  readonly scissor: ScissorRect;
  readonly drawnPageRange: readonly [number, number];
}

/**
 * The `<canvas>` elements the effect layer draws into: the two scroll ones or
 * none, and the fixed one or `null`.
 *
 * @internal
 */
export interface EffectLayerCanvases {
  readonly scroll: readonly HTMLCanvasElement[];
  readonly fixed: HTMLCanvasElement | null;
}

/**
 * Starts the effect layer on one device. `container` is the box that clips
 * the scroll `<canvas>` elements to the document, and `probe` a box inside it
 * that is as tall as the large viewport.
 *
 * Frames run only on demand: after a scroll, a resize, or a change of
 * effects, and then for as long as an effect asks for the next one.
 *
 * @internal
 */
export function createEffectLayer(
  { device, format }: EffectDevice,
  container: HTMLElement,
  probe: HTMLElement,
) {
  const targetLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPU_SHADER_STAGE.VERTEX | GPU_SHADER_STAGE.FRAGMENT,
        buffer: { type: "uniform" },
      },
    ],
  });
  const setup: EffectSetup = { device, format, targetLayout, requestFrame };
  const renderers = new Map<Effect, { renderer: EffectRenderer | null }>();
  let ready: EffectRenderer[] = [];
  let scroll: ScrollCanvas[] = [];
  let fixed: ConfiguredCanvas | null = null;

  let pageLeft = 0;
  let pageTop = 0;
  let documentWidth = 0;
  let documentHeight = 0;
  let viewportHeight = 0;
  let sizesChanged = true;
  let frameRequest = 0;
  let destroyed = false;
  const startTime = performance.now();
  let lastFrameTime: number | null = null;

  const reducedMotionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  let pixelRatioQuery = watchPixelRatio();

  const resizeObserver = new ResizeObserver((entries) => {
    for (const { target, contentRect } of entries) {
      if (target === probe) {
        sizesChanged ||= viewportHeight !== contentRect.height;
        viewportHeight = contentRect.height;
      } else {
        const rect = container.getBoundingClientRect();
        pageLeft = rect.left + window.scrollX;
        pageTop = rect.top + window.scrollY;
        sizesChanged ||= documentWidth !== contentRect.width;
        documentWidth = contentRect.width;
        documentHeight = contentRect.height;
      }
    }
    requestFrame();
  });
  resizeObserver.observe(container);
  resizeObserver.observe(probe);
  window.addEventListener("scroll", requestFrame, { passive: true });
  reducedMotionQuery.addEventListener("change", requestFrame);

  function requestFrame() {
    if (!destroyed) {
      frameRequest ||= requestAnimationFrame(renderFrame);
    }
  }

  function watchPixelRatio() {
    const query = window.matchMedia(
      `(resolution: ${String(window.devicePixelRatio)}dppx)`,
    );
    query.addEventListener("change", onPixelRatioChange, { once: true });
    return query;
  }

  function onPixelRatioChange() {
    pixelRatioQuery = watchPixelRatio();
    sizesChanged = true;
    requestFrame();
  }

  function configure(canvas: HTMLCanvasElement): ConfiguredCanvas | null {
    const context = canvas.getContext("webgpu");
    if (!(context instanceof GPUCanvasContext)) {
      return null;
    }
    context.configure({ device, format, alphaMode: "premultiplied" });
    const uniform = device.createBuffer({
      size: TARGET_UNIFORM_BYTES,
      usage: GPU_BUFFER_USAGE.UNIFORM | GPU_BUFFER_USAGE.COPY_DST,
    });
    const bindGroup = device.createBindGroup({
      layout: targetLayout,
      entries: [{ binding: 0, resource: { buffer: uniform } }],
    });
    return { canvas, context, uniform, bindGroup };
  }

  function release({ context, uniform }: ConfiguredCanvas) {
    context.unconfigure();
    uniform.destroy();
  }

  function setCanvases(canvases: EffectLayerCanvases) {
    if (scroll[0]?.canvas !== canvases.scroll[0]) {
      for (const slot of scroll) {
        release(slot);
      }
      scroll = canvases.scroll.flatMap((canvas) => {
        const configured = configure(canvas);
        return configured === null ? [] : [{ ...configured, bandIndex: null }];
      });
    }
    if (fixed?.canvas !== canvases.fixed) {
      if (fixed !== null) {
        release(fixed);
      }
      fixed = canvases.fixed && configure(canvases.fixed);
    }
    sizesChanged = true;
    requestFrame();
  }

  function collectReady() {
    ready = [...renderers.values()].flatMap(({ renderer }) =>
      renderer === null ? [] : [renderer],
    );
    requestFrame();
  }

  function setEffects(effects: readonly Effect[]) {
    for (const [effect, entry] of renderers) {
      if (!effects.includes(effect)) {
        entry.renderer?.destroy();
        renderers.delete(effect);
      }
    }
    for (const effect of effects) {
      if (renderers.has(effect)) {
        continue;
      }
      const entry: { renderer: EffectRenderer | null } = { renderer: null };
      renderers.set(effect, entry);
      Promise.resolve(effect.setup(setup)).then(
        (renderer) => {
          if (destroyed || renderers.get(effect) !== entry) {
            renderer.destroy();
            return;
          }
          entry.renderer = renderer;
          collectReady();
        },
        (error: unknown) => {
          reportError(error);
        },
      );
    }
    collectReady();
  }

  function sizeCanvas(
    canvas: HTMLCanvasElement,
    cssWidth: number,
    cssHeight: number,
  ) {
    const limit = device.limits.maxTextureDimension2D;
    const ratio = Math.min(
      window.devicePixelRatio,
      MAX_PIXEL_RATIO,
      limit / cssWidth,
      limit / cssHeight,
    );
    canvas.style.width = `${String(cssWidth)}px`;
    canvas.style.height = `${String(cssHeight)}px`;
    const backingWidth = Math.max(1, Math.round(cssWidth * ratio));
    const backingHeight = Math.max(1, Math.round(cssHeight * ratio));
    if (canvas.width !== backingWidth) {
      canvas.width = backingWidth;
    }
    if (canvas.height !== backingHeight) {
      canvas.height = backingHeight;
    }
  }

  function applySizes() {
    const { viewport, bandHeight } = bandGeometry(viewportHeight);
    for (const slot of scroll) {
      sizeCanvas(slot.canvas, documentWidth, bandHeight);
      slot.bandIndex = null;
    }
    if (fixed !== null) {
      sizeCanvas(fixed.canvas, documentWidth, viewport);
    }
  }

  /** Places the scroll `<canvas>` elements and lists this frame's passes. */
  function planPasses(scrollX: number, scrollY: number): Pass[] {
    const { viewport, bandHeight } = bandGeometry(viewportHeight);
    const passes: Pass[] = [];
    if (scroll.length === 2) {
      for (const band of computeBands({
        scrollTop: scrollY - pageTop,
        viewportHeight,
        documentHeight,
      })) {
        const slot = scroll[band.slot];
        if (slot.bandIndex !== band.index) {
          slot.bandIndex = band.index;
          slot.canvas.style.transform = `translateY(${String(band.top)}px)`;
        }
        const y = pageTop + band.top;
        passes.push({
          configured: slot,
          scissor: bandScissorRect(
            band,
            slot.canvas.width,
            slot.canvas.height,
            bandHeight,
          ),
          drawnPageRange: [
            y + band.drawnTop,
            y + band.drawnTop + band.drawnHeight,
          ],
          target: {
            canvas: "scroll",
            band,
            x: pageLeft,
            y,
            width: documentWidth,
            height: bandHeight,
            bindGroup: slot.bindGroup,
          },
        });
      }
    }
    if (fixed !== null) {
      passes.push({
        configured: fixed,
        scissor: {
          x: 0,
          y: 0,
          width: fixed.canvas.width,
          height: fixed.canvas.height,
        },
        drawnPageRange: [scrollY, scrollY + viewport],
        target: {
          canvas: "fixed",
          band: null,
          x: scrollX,
          y: scrollY,
          width: documentWidth,
          height: viewport,
          bindGroup: fixed.bindGroup,
        },
      });
    }
    return passes;
  }

  function encodePass(
    encoder: GPUCommandEncoder,
    { configured, target, scissor, drawnPageRange }: Pass,
    frame: EffectFrame,
  ) {
    const { canvas, context, uniform } = configured;
    device.queue.writeBuffer(
      uniform,
      0,
      packTargetUniform({
        pageOffset: [target.x, target.y],
        cssSize: [target.width, target.height],
        pixelScale: [
          canvas.width / target.width,
          canvas.height / target.height,
        ],
        drawnPageRange,
        seconds: frame.time,
      }),
    );
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    pass.setScissorRect(scissor.x, scissor.y, scissor.width, scissor.height);
    for (const renderer of ready) {
      renderer.draw(pass, target, frame);
    }
    pass.end();
  }

  function renderFrame(now: number) {
    frameRequest = 0;
    if (sizesChanged) {
      sizesChanged = false;
      applySizes();
    }
    if (documentWidth === 0 || viewportHeight === 0) {
      return;
    }

    const { scrollX, scrollY } = window;
    const passes = planPasses(scrollX, scrollY);
    const frame: EffectFrame = {
      time: (now - startTime) / 1000,
      delta:
        lastFrameTime === null
          ? 0
          : Math.min((now - lastFrameTime) / 1000, MAX_DELTA_SECONDS),
      reducedMotion: reducedMotionQuery.matches,
      viewport: {
        x: scrollX,
        y: scrollY,
        width: documentWidth,
        height: bandGeometry(viewportHeight).viewport,
      },
      documentHeight,
      targets: passes.map(({ target }) => target),
    };
    lastFrameTime = now;

    const encoder = device.createCommandEncoder();
    let animating = false;
    for (const renderer of ready) {
      if (renderer.update?.(encoder, frame) === true) {
        animating = true;
      }
    }
    for (const pass of passes) {
      encodePass(encoder, pass, frame);
    }
    device.queue.submit([encoder.finish()]);
    if (animating && !frame.reducedMotion) {
      requestFrame();
    }
  }

  function destroy() {
    destroyed = true;
    cancelAnimationFrame(frameRequest);
    resizeObserver.disconnect();
    window.removeEventListener("scroll", requestFrame);
    reducedMotionQuery.removeEventListener("change", requestFrame);
    pixelRatioQuery.removeEventListener("change", onPixelRatioChange);
    for (const { renderer } of renderers.values()) {
      renderer?.destroy();
    }
    renderers.clear();
    ready = [];
    for (const slot of scroll) {
      release(slot);
    }
    if (fixed !== null) {
      release(fixed);
    }
    scroll = [];
    fixed = null;
  }

  return { setCanvases, setEffects, destroy };
}
