import { REDUCED_MOTION_QUERY } from "../prefers-reduced-motion.ts";
import {
  bandGeometry,
  bandScissorRect,
  computeBands,
  type ScissorRect,
} from "./compute-bands.ts";
import { GPU_BUFFER_USAGE, GPU_SHADER_STAGE } from "./constants.ts";
import type { EffectRegistry } from "./create-effect-registry.ts";
import { createFrameScheduler } from "./create-frame-scheduler.ts";
import {
  ELEMENT_BYTES,
  packElements,
  packPageUniform,
  PAGE_UNIFORM_BYTES,
} from "./page-wgsl.ts";
import type { EffectDevice } from "./request-effect-device.ts";
import { packTargetUniform, TARGET_UNIFORM_BYTES } from "./target-wgsl.ts";
import { trackElements } from "./track-elements.ts";
import { trackPointer } from "./track-pointer.ts";
import type {
  Effect,
  EffectElementRecord,
  EffectFrame,
  EffectRenderer,
  EffectSetup,
  EffectTarget,
} from "./types.ts";

const MAX_PIXEL_RATIO = 2;
const MAX_DELTA_SECONDS = 0.1;
const MIN_ELEMENT_CAPACITY = 16;
const ALL_STAGES =
  GPU_SHADER_STAGE.VERTEX |
  GPU_SHADER_STAGE.FRAGMENT |
  GPU_SHADER_STAGE.COMPUTE;

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
 * Which `<canvas>` elements the registered elements with a role need: the
 * scroll ones for elements in the document, the fixed one for fixed elements.
 *
 * @internal
 */
export interface EffectCanvasNeeds {
  readonly scroll: boolean;
  readonly fixed: boolean;
}

interface EffectLayerOptions {
  readonly registry: EffectRegistry;
  /** The box that clips the scroll `<canvas>` elements to the document. */
  readonly container: HTMLElement;
  /** A box inside `container` that is as tall as the large viewport. */
  readonly probe: HTMLElement;
  readonly onCanvasNeedsChange: (needs: EffectCanvasNeeds) => void;
}

/**
 * Starts the effect layer on one device.
 *
 * Each registered element measures itself again when it can have changed,
 * as `trackElements` describes, and a frame reads the last measurement of
 * each. A frame draws only when something changed: a scroll, a resize, a
 * change of effects, an element that moved or changed fill, or an effect
 * that asks for the next frame. The rest of the time no frame runs.
 *
 * @internal
 */
export function createEffectLayer(
  { device, format }: EffectDevice,
  { registry, container, probe, onCanvasNeedsChange }: EffectLayerOptions,
) {
  const pageLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: ALL_STAGES, buffer: { type: "uniform" } },
      {
        binding: 1,
        visibility: ALL_STAGES,
        buffer: { type: "read-only-storage" },
      },
    ],
  });
  const targetLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPU_SHADER_STAGE.VERTEX | GPU_SHADER_STAGE.FRAGMENT,
        buffer: { type: "uniform" },
      },
    ],
  });
  const setup: EffectSetup = {
    device,
    format,
    pageLayout,
    targetLayout,
    requestFrame,
  };
  const renderers = new Map<Effect, { renderer: EffectRenderer | null }>();
  let ready: EffectRenderer[] = [];
  let followsPointer = false;
  let scroll: ScrollCanvas[] = [];
  let fixed: ConfiguredCanvas | null = null;

  const pageUniform = device.createBuffer({
    size: PAGE_UNIFORM_BYTES,
    usage: GPU_BUFFER_USAGE.UNIFORM | GPU_BUFFER_USAGE.COPY_DST,
  });
  let elementCapacity = 0;
  let elementBuffer = growElements(MIN_ELEMENT_CAPACITY);
  let pageBindGroup = createPageBindGroup();
  let packed = new ArrayBuffer(elementCapacity * ELEMENT_BYTES);
  let previousPacked = new ArrayBuffer(elementCapacity * ELEMENT_BYTES);
  let previousCount = -1;
  let canvasNeeds: EffectCanvasNeeds | null = null;

  let pageLeft = 0;
  let pageTop = 0;
  let documentWidth = 0;
  let documentHeight = 0;
  let viewportHeight = 0;
  let sizesChanged = true;
  let drawRequested = true;
  let destroyed = false;
  const startTime = performance.now();
  let lastFrameTime: number | null = null;

  const reducedMotionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  let pixelRatioQuery = watchPixelRatio();
  const frames = createFrameScheduler();
  const tracking = trackElements(registry, frames, requestElementsFrame);
  // A change of settings moves no element, so draw a frame for it.
  const unsubscribeSettings = registry.subscribe(requestFrame);
  const pointer = trackPointer(() => {
    if (followsPointer) {
      requestFrame();
    }
  });

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

  /** Runs a frame next, which draws if the elements changed. */
  function requestElementsFrame() {
    if (!destroyed) {
      frames.draw(renderFrame);
    }
  }

  /** Draws next frame. */
  function requestFrame() {
    drawRequested = true;
    requestElementsFrame();
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
    followsPointer = ready.some((renderer) => renderer.followsPointer === true);
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

  function growElements(capacity: number) {
    elementCapacity = capacity;
    return device.createBuffer({
      size: capacity * ELEMENT_BYTES,
      usage: GPU_BUFFER_USAGE.STORAGE | GPU_BUFFER_USAGE.COPY_DST,
    });
  }

  function createPageBindGroup() {
    return device.createBindGroup({
      layout: pageLayout,
      entries: [
        { binding: 0, resource: { buffer: pageUniform } },
        { binding: 1, resource: { buffer: elementBuffer } },
      ],
    });
  }

  /**
   * Packs the elements, and uploads them when they differ from the last
   * upload. Returns whether they did.
   */
  function writeElements(records: readonly EffectElementRecord[]) {
    const capacity = Math.max(
      MIN_ELEMENT_CAPACITY,
      2 ** Math.ceil(Math.log2(records.length)),
    );
    if (capacity !== elementCapacity) {
      elementBuffer.destroy();
      elementBuffer = growElements(capacity);
      pageBindGroup = createPageBindGroup();
      packed = new ArrayBuffer(capacity * ELEMENT_BYTES);
      previousPacked = new ArrayBuffer(capacity * ELEMENT_BYTES);
      previousCount = -1;
    }
    [packed, previousPacked] = [previousPacked, packed];
    packElements(records, packed);
    const words = new Uint32Array(
      packed,
      0,
      (records.length * ELEMENT_BYTES) / 4,
    );
    const previous = new Uint32Array(previousPacked, 0, words.length);
    if (
      records.length === previousCount &&
      words.every((word, index) => word === previous[index])
    ) {
      return false;
    }
    previousCount = records.length;
    device.queue.writeBuffer(elementBuffer, 0, words);
    return true;
  }

  function reportCanvasNeeds(records: readonly EffectElementRecord[]) {
    const needs = {
      scroll: records.some((record) => record.roles !== 0 && !record.fixed),
      fixed: records.some((record) => record.roles !== 0 && record.fixed),
    };
    if (
      needs.scroll !== canvasNeeds?.scroll ||
      needs.fixed !== canvasNeeds.fixed
    ) {
      canvasNeeds = needs;
      onCanvasNeedsChange(needs);
    }
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

  /**
   * Places the scroll `<canvas>` elements and lists this frame's passes.
   * `documentElements` is how many records, at the start, are in the
   * document rather than fixed.
   */
  function planPasses(
    scrollX: number,
    scrollY: number,
    documentElements: number,
    totalElements: number,
  ): Pass[] {
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
            firstElement: 0,
            elementCount: documentElements,
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
          firstElement: documentElements,
          elementCount: totalElements - documentElements,
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
      pass.setBindGroup(0, frame.pageBindGroup);
      pass.setBindGroup(1, target.bindGroup);
      renderer.draw(pass, target, frame);
    }
    pass.end();
  }

  function renderFrame(now: number) {
    const { scrollX, scrollY } = window;
    const records = registry.records(scrollX, scrollY);
    const elementsChanged = writeElements(records);
    reportCanvasNeeds(records);
    if (!drawRequested && !elementsChanged) {
      return;
    }
    drawRequested = false;

    if (sizesChanged) {
      sizesChanged = false;
      applySizes();
    }
    if (documentWidth === 0 || viewportHeight === 0) {
      return;
    }

    const passes = planPasses(
      scrollX,
      scrollY,
      records.filter((record) => !record.fixed).length,
      records.length,
    );
    const viewport = bandGeometry(viewportHeight).viewport;
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
        height: viewport,
      },
      documentHeight,
      elements: records,
      pointer: pointer.read(scrollX, scrollY, now),
      pageBindGroup,
      targets: passes.map(({ target }) => target),
    };
    lastFrameTime = now;
    device.queue.writeBuffer(
      pageUniform,
      0,
      packPageUniform({
        viewport: [scrollX, scrollY, documentWidth, viewport],
        pointer: frame.pointer,
        documentSize: [documentWidth, documentHeight],
        seconds: frame.time,
        delta: frame.delta,
        elementCount: records.length,
      }),
    );

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
    frames.destroy();
    resizeObserver.disconnect();
    tracking.destroy();
    unsubscribeSettings();
    pointer.destroy();
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
    pageUniform.destroy();
    elementBuffer.destroy();
  }

  return { setCanvases, setEffects, destroy };
}
