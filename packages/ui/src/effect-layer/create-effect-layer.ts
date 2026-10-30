// The effect layer is global. One layer draws the effects of all elements.
// Each <canvas> element belongs to an Effect carrier: the viewport or a
// Scroll region. The page is the root Scroll region. A <canvas> element
// never belongs to one element. A component must not add a <canvas>
// element.
// The carrier of an element comes from EffectCarrierContext. Measurement
// gives only the geometry. It does not choose the <canvas> element.
// The scroll <canvas> elements are in the scrolled content, thus the
// compositor moves them with the content. Do not measure elements again on
// scroll to move their effects. That is one frame late.
// While a modal Effect cover shows, the page and each Scroll region under
// it have no <canvas> element. Their elements keep their state.
import {
  prefersReducedMotion,
  subscribeReducedMotion,
} from "../motion/prefers-reduced-motion.ts";
import { carrierOf } from "./carrier-of.ts";
import { bandGeometry } from "./compute-bands.ts";
import { GPU_BUFFER_USAGE, GPU_SHADER_STAGE } from "./constants.ts";
import type { EffectRegistry } from "./create-effect-registry.ts";
import { createFrameClock } from "./create-frame-clock.ts";
import { createFrameScheduler } from "./create-frame-scheduler.ts";
import { createPackedBuffer } from "./create-packed-buffer.ts";
import { encodeCanvasPass } from "./encode-canvas-pass.ts";
import {
  ELEMENT_BYTES,
  packElements,
  packPageUniform,
  packRanges,
  packScopes,
  PAGE_UNIFORM_BYTES,
  RANGE_BYTES,
  rangesOf,
  SCOPE_BYTES,
} from "./page-wgsl.ts";
import type { EffectColor } from "./parse-css-color.ts";
import {
  PAGE_SCOPE,
  planCanvasNeeds,
  planScopes,
  type ScopePlan,
} from "./plan-scopes.ts";
import type { EffectDevice } from "./request-effect-device.ts";
import type { CarrierKey } from "./resolve-carrier.ts";
import { packTargetUniform, TARGET_UNIFORM_BYTES } from "./target-wgsl.ts";
import { trackElements } from "./track-elements.ts";
import { trackPointer } from "./track-pointer.ts";
import type {
  CanvasKit,
  CanvasNeed,
  CarrierCanvases,
  CarrierFrame,
  CarrierPass,
  CarrierSurface,
  Effect,
  EffectFrame,
  EffectRenderer,
  EffectSetup,
} from "./types.ts";

const MAX_PIXEL_RATIO = 2;
const MAX_DELTA_SECONDS = 0.1;
const ALL_STAGES =
  GPU_SHADER_STAGE.VERTEX |
  GPU_SHADER_STAGE.FRAGMENT |
  GPU_SHADER_STAGE.COMPUTE;

interface ConfiguredCanvas extends CarrierSurface {
  readonly context: GPUCanvasContext;
  readonly uniform: GPUBuffer;
  /** The last pass drew something, so the `<canvas>` element shows it. */
  shown: boolean;
}

interface EffectLayerOptions {
  readonly registry: EffectRegistry;
  /** The box that clips the scroll `<canvas>` elements to the document. */
  readonly container: HTMLElement;
  /** A box inside `container` that is as tall as the large viewport. */
  readonly probe: HTMLElement;
  /**
   * A fixed 0 x 0 box at the viewport's bottom edge, which holds the bottom
   * `<canvas>` element.
   */
  readonly bottomAnchor: HTMLElement;
  readonly onCanvasNeedsChange: (needs: readonly CanvasNeed[]) => void;
}

/**
 * Starts the effect layer on one device.
 *
 * Each registered element measures itself again when it can have changed,
 * as `trackElements` describes, and a frame reads the last measurement of
 * each. A frame draws only when something changed: a scroll, a resize, a
 * change of effects, an element that moved or changed fill, a change of the
 * page's backdrop, or an effect that asks for the next frame. The rest of the time no frame runs.
 *
 * @internal
 */
export function createEffectLayer(
  { device, format }: EffectDevice,
  {
    registry,
    container,
    probe,
    bottomAnchor,
    onCanvasNeedsChange,
  }: EffectLayerOptions,
) {
  const pageLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: ALL_STAGES, buffer: { type: "uniform" } },
      ...[1, 2, 3].map((binding) => ({
        binding,
        visibility: ALL_STAGES,
        buffer: { type: "read-only-storage" as const },
      })),
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
  let pointerFollowers: readonly NonNullable<
    EffectRenderer["followsPointer"]
  >[] = [];
  const carriers = new Map<CarrierKey, CarrierCanvases<ConfiguredCanvas>>();

  const pageUniform = device.createBuffer({
    size: PAGE_UNIFORM_BYTES,
    usage: GPU_BUFFER_USAGE.UNIFORM | GPU_BUFFER_USAGE.COPY_DST,
  });
  const elementBuffer = createPackedBuffer(device, ELEMENT_BYTES, packElements);
  const scopeBuffer = createPackedBuffer(device, SCOPE_BYTES, packScopes);
  const rangeBuffer = createPackedBuffer(device, RANGE_BYTES, packRanges);
  let pageBuffers = [
    elementBuffer.buffer,
    scopeBuffer.buffer,
    rangeBuffer.buffer,
  ];
  let pageBindGroup = createPageBindGroup();
  let pageBackdrop: EffectColor | null = null;
  let canvasNeeds: readonly CanvasNeed[] | null = null;

  let pageLeft = 0;
  let pageTop = 0;
  let documentWidth = 0;
  let documentHeight = 0;
  let viewportHeight = 0;
  let drawRequested = true;
  let destroyed = false;
  const startTime = performance.now();
  const clock = createFrameClock(MAX_DELTA_SECONDS);

  let pixelRatioQuery = watchPixelRatio();
  const frames = createFrameScheduler(requestFrame);
  const readViewportBottom = () => bottomAnchor.getBoundingClientRect().bottom;
  const tracking = trackElements(
    registry,
    frames,
    requestElementsFrame,
    readViewportBottom,
    requestFrame,
  );
  // A change of settings moves no element, so draw a frame for it.
  const unsubscribeSettings = registry.subscribe(requestFrame);
  const pointer = trackPointer(() => {
    if (pointerFollowers.length === 0) {
      return;
    }
    const now = pointer.read(window.scrollX, window.scrollY, performance.now());
    if (
      pointerFollowers.some(
        (follows) => follows === true || (follows !== false && follows(now)),
      )
    ) {
      requestFrame();
    }
  });

  const resizeObserver = new ResizeObserver((entries) => {
    for (const { target, contentRect } of entries) {
      if (target === probe) {
        viewportHeight = contentRect.height;
      } else {
        const rect = container.getBoundingClientRect();
        pageLeft = rect.left + window.scrollX;
        pageTop = rect.top + window.scrollY;
        documentWidth = contentRect.width;
        documentHeight = contentRect.height;
      }
    }
    requestFrame();
  });
  resizeObserver.observe(container);
  resizeObserver.observe(probe);
  window.addEventListener("scroll", requestFrame, { passive: true });
  let reducedMotion = prefersReducedMotion();
  const stopReducedMotion = subscribeReducedMotion(() => {
    reducedMotion = prefersReducedMotion();
    requestFrame();
  });

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
    return { canvas, context, uniform, bindGroup, shown: true };
  }

  function release({ canvas, context, uniform }: ConfiguredCanvas) {
    context.unconfigure();
    uniform.destroy();
    // A <canvas> element keeps its backing store until it is collected. iOS
    // frees it at once when its size is 0.
    if (!canvas.isConnected) {
      canvas.width = 0;
      canvas.height = 0;
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

  const kit: CanvasKit<ConfiguredCanvas> = {
    configure,
    release,
    size: sizeCanvas,
  };

  /**
   * Gives the carrier `key` its `<canvas>` elements, or takes them away
   * with `null`.
   */
  function setCanvases(
    key: CarrierKey,
    canvases: readonly HTMLCanvasElement[] | null,
  ) {
    const known = carriers.get(key);
    if (known !== undefined && known.canvases[0] === canvases?.[0]) {
      return;
    }
    known?.release();
    carriers.delete(key);
    if (canvases !== null) {
      carriers.set(key, carrierOf(key).createCanvases(canvases, kit));
    }
    requestFrame();
  }

  function collectReady() {
    ready = [...renderers.values()].flatMap(({ renderer }) =>
      renderer === null ? [] : [renderer],
    );
    pointerFollowers = ready.flatMap(({ followsPointer }) =>
      followsPointer === undefined || followsPointer === false
        ? []
        : [followsPointer],
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

  function createPageBindGroup() {
    return device.createBindGroup({
      layout: pageLayout,
      entries: [pageUniform, ...pageBuffers].map((buffer, binding) => ({
        binding,
        resource: { buffer },
      })),
    });
  }

  /**
   * Uploads the elements and the scopes, and returns whether they, or the
   * page's backdrop, changed since the last frame.
   */
  function writePage(plan: ScopePlan) {
    const elementsChanged = elementBuffer.write(plan.elements);
    const scopesChanged = scopeBuffer.write(plan.scopes);
    const rangesChanged = rangeBuffer.write(rangesOf(plan.scopes));
    const buffers = [
      elementBuffer.buffer,
      scopeBuffer.buffer,
      rangeBuffer.buffer,
    ];
    if (buffers.some((buffer, index) => buffer !== pageBuffers[index])) {
      pageBuffers = buffers;
      pageBindGroup = createPageBindGroup();
    }
    const backdrop = plan.scopes[PAGE_SCOPE].backdrop;
    const backdropChanged =
      pageBackdrop === null ||
      backdrop.some((channel, index) => channel !== pageBackdrop?.[index]);
    pageBackdrop = backdrop;
    return elementsChanged || scopesChanged || rangesChanged || backdropChanged;
  }

  function reportCanvasNeeds(plan: ScopePlan) {
    const needs = planCanvasNeeds(
      plan,
      registry.modalCovers(),
      registry.region,
      new Set(ready.flatMap(({ holds }) => holds?.() ?? [])),
    );
    const known = canvasNeeds;
    const same =
      known?.length === needs.length &&
      needs.every(
        ({ key, content }, index) =>
          known[index].key === key && known[index].content === content,
      );
    if (!same) {
      canvasNeeds = needs;
      onCanvasNeedsChange(needs);
    }
  }

  /**
   * Places the `<canvas>` elements of each carrier and lists this frame's
   * passes, in the order of `plan.carriers`.
   */
  function planPasses(
    frame: CarrierFrame,
    plan: ScopePlan,
  ): CarrierPass<ConfiguredCanvas>[] {
    return plan.carriers.flatMap(
      (key, index) =>
        carriers.get(key)?.passes(frame, index, plan.ranges[index]) ?? [],
    );
  }

  function encodePass(
    encoder: GPUCommandEncoder,
    { surface: configured, target, scissor }: CarrierPass<ConfiguredCanvas>,
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
        drawnPageRange: target.drawnPageRange,
        seconds: frame.time,
      }),
    );
    const begin = () => {
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
      return pass;
    };
    configured.shown = encodeCanvasPass(begin, configured.shown, (pass) => {
      for (const renderer of ready) {
        pass.setBindGroup(0, frame.pageBindGroup);
        pass.setBindGroup(1, target.bindGroup);
        renderer.draw(pass, target, frame);
      }
    });
  }

  function renderFrame(now: number) {
    const delta = clock.start(now);
    const { scrollX, scrollY } = window;
    // Read the bottom edge before this frame writes a style, so that the
    // read does not cause one more layout.
    let viewportBottom = carriers.has("fixedBottom")
      ? readViewportBottom()
      : null;
    const bottomNow = () => (viewportBottom ??= readViewportBottom());
    const carrierClock = tracking.clock(scrollX, scrollY, bottomNow);
    const plan = planScopes(
      registry.records(carrierClock),
      tracking.pageBackdrop(),
    );
    const records = plan.elements;
    const pageChanged = writePage(plan);
    reportCanvasNeeds(plan);
    if (!drawRequested && !pageChanged) {
      return;
    }
    drawRequested = false;

    const carrierFrame: CarrierFrame = {
      clock: carrierClock,
      document: {
        left: pageLeft,
        top: pageTop,
        width: documentWidth,
        height: documentHeight,
      },
      viewportHeight,
      pixelRatio: window.devicePixelRatio,
    };
    for (const canvases of carriers.values()) {
      canvases.size(carrierFrame);
    }
    if (documentWidth === 0 || viewportHeight === 0) {
      return;
    }

    const passes = planPasses(carrierFrame, plan);
    const viewport = bandGeometry(viewportHeight).viewport;
    const frame: EffectFrame = {
      time: (now - startTime) / 1000,
      delta,
      reducedMotion,
      viewport: {
        x: scrollX,
        y: scrollY,
        width: documentWidth,
        height: viewport,
      },
      documentHeight,
      carriers: plan.carriers,
      elements: records,
      scopes: plan.scopes,
      pointer: pointer.read(scrollX, scrollY, now),
      pageBindGroup,
      targets: passes.map(({ target }) => target),
    };
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
        scopeCount: plan.scopes.length,
        carrierCount: plan.carriers.length,
      }),
    );

    const encoder = device.createCommandEncoder();
    let animating = false;
    let wakeTime = Infinity;
    for (const renderer of ready) {
      const next = renderer.update?.(encoder, frame);
      if (next === true) {
        animating = true;
      } else if (typeof next === "number") {
        wakeTime = Math.min(wakeTime, next);
      }
    }
    frames.wake(startTime + wakeTime * 1000);
    // Report again after the updates. An effect can stop to hold a carrier
    // in this frame, and this frame can be the last one.
    reportCanvasNeeds(plan);
    for (const pass of passes) {
      encodePass(encoder, pass, frame);
    }
    device.queue.submit([encoder.finish()]);
    if (animating && !frame.reducedMotion) {
      clock.follow(now);
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
    stopReducedMotion();
    pixelRatioQuery.removeEventListener("change", onPixelRatioChange);
    for (const { renderer } of renderers.values()) {
      renderer?.destroy();
    }
    renderers.clear();
    ready = [];
    for (const canvases of carriers.values()) {
      canvases.release();
    }
    carriers.clear();
    pageUniform.destroy();
    elementBuffer.destroy();
    scopeBuffer.destroy();
    rangeBuffer.destroy();
  }

  return { setCanvases, setEffects, destroy };
}
