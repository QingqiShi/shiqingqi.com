import { REDUCED_MOTION_QUERY } from "../prefers-reduced-motion.ts";
import {
  bandGeometry,
  bandScissorRect,
  computeBands,
  fixedBottomTop,
  type ScissorRect,
} from "./compute-bands.ts";
import { GPU_BUFFER_USAGE, GPU_SHADER_STAGE } from "./constants.ts";
import type { EffectRegistry } from "./create-effect-registry.ts";
import { createFrameClock } from "./create-frame-clock.ts";
import { createFrameScheduler } from "./create-frame-scheduler.ts";
import { createPackedBuffer } from "./create-packed-buffer.ts";
import {
  describeError,
  noteEffect,
  setEffectStatus,
} from "./effect-diagnostics.ts";
import { encodeCanvasPass } from "./encode-canvas-pass.ts";
import {
  ELEMENT_BYTES,
  packElements,
  packPageUniform,
  packScopes,
  PAGE_UNIFORM_BYTES,
  SCOPE_BYTES,
} from "./page-wgsl.ts";
import type { EffectColor } from "./parse-css-color.ts";
import {
  PAGE_SCOPE,
  planScopes,
  readPageBackdrop,
  type CanvasRange,
  type ScopePlan,
} from "./plan-scopes.ts";
import type { EffectDevice } from "./request-effect-device.ts";
import { packTargetUniform, TARGET_UNIFORM_BYTES } from "./target-wgsl.ts";
import { trackElements } from "./track-elements.ts";
import { trackPointer } from "./track-pointer.ts";
import type {
  Effect,
  EffectCanvas,
  EffectFrame,
  EffectRenderer,
  EffectSetup,
  EffectTarget,
  ElementRange,
  StageFrame,
} from "./types.ts";

const MAX_PIXEL_RATIO = 2;
const MAX_DELTA_SECONDS = 0.1;
const ALL_STAGES =
  GPU_SHADER_STAGE.VERTEX |
  GPU_SHADER_STAGE.FRAGMENT |
  GPU_SHADER_STAGE.COMPUTE;

interface ConfiguredCanvas {
  readonly canvas: HTMLCanvasElement;
  readonly context: GPUCanvasContext;
  readonly uniform: GPUBuffer;
  readonly bindGroup: GPUBindGroup;
  /** The last pass drew something, so the `<canvas>` element shows it. */
  shown: boolean;
}

interface ScrollCanvas extends ConfiguredCanvas {
  /** The band the `<canvas>` element sits on, kept while it is out of range. */
  bandIndex: number | null;
}

interface StageCanvas extends ConfiguredCanvas {
  /** The CSS size it was last given. */
  cssWidth: number;
  cssHeight: number;
  /** A frame of this run listed it, so its stage is still there. */
  seen: boolean;
}

interface Pass {
  readonly configured: ConfiguredCanvas;
  readonly target: EffectTarget;
  readonly scissor: ScissorRect;
  readonly drawnPageRange: readonly [number, number];
}

/** The passes of one frame, and the Effect stages they draw on. */
interface PassPlan {
  readonly passes: Pass[];
  readonly stages: StageFrame[];
}

/**
 * The `<canvas>` elements the effect layer draws into: the two scroll ones or
 * none, the fixed one or `null`, and the bottom one or `null`.
 *
 * @internal
 */
export interface EffectLayerCanvases {
  readonly scroll: readonly HTMLCanvasElement[];
  readonly fixed: HTMLCanvasElement | null;
  readonly fixedBottom: HTMLCanvasElement | null;
}

/**
 * Which `<canvas>` elements the registered elements with a role need: the
 * scroll ones for elements in the document, the fixed one for fixed elements,
 * the bottom one for elements fixed to the viewport's bottom edge.
 *
 * @internal
 */
export interface EffectCanvasNeeds {
  readonly scroll: boolean;
  readonly fixed: boolean;
  readonly fixedBottom: boolean;
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
  readonly onCanvasNeedsChange: (needs: EffectCanvasNeeds) => void;
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
      ...[1, 2].map((binding) => ({
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
  let scroll: ScrollCanvas[] = [];
  let fixed: ConfiguredCanvas | null = null;
  let fixedBottom: ConfiguredCanvas | null = null;
  /** The `<canvas>` elements of the Effect stages, configured as they come. */
  const stageCanvases = new Map<HTMLCanvasElement, StageCanvas>();

  const pageUniform = device.createBuffer({
    size: PAGE_UNIFORM_BYTES,
    usage: GPU_BUFFER_USAGE.UNIFORM | GPU_BUFFER_USAGE.COPY_DST,
  });
  const elementBuffer = createPackedBuffer(device, ELEMENT_BYTES, packElements);
  const scopeBuffer = createPackedBuffer(device, SCOPE_BYTES, packScopes);
  let pageBuffers = [elementBuffer.buffer, scopeBuffer.buffer];
  let pageBindGroup = createPageBindGroup();
  let pageBackdrop: EffectColor | null = null;
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
  const clock = createFrameClock(MAX_DELTA_SECONDS);

  const reducedMotionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  let pixelRatioQuery = watchPixelRatio();
  const frames = createFrameScheduler();
  const readViewportBottom = () => bottomAnchor.getBoundingClientRect().bottom;
  const tracking = trackElements(
    registry,
    frames,
    requestElementsFrame,
    readViewportBottom,
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
    const kind =
      canvas.dataset.effectLayer ?? canvas.parentElement?.tagName ?? "?";
    const context = canvas.getContext("webgpu");
    if (!(context instanceof GPUCanvasContext)) {
      noteEffect(
        `canvas ${kind}: getContext("webgpu") gave ${context === null ? "null" : Object.prototype.toString.call(context)}`,
      );
      return null;
    }
    try {
      context.configure({ device, format, alphaMode: "premultiplied" });
    } catch (error) {
      noteEffect(`canvas ${kind}: configure threw ${describeError(error)}`);
      throw error;
    }
    noteEffect(
      `canvas ${kind}: configured ${format} premultiplied at ${String(canvas.width)}x${String(canvas.height)}`,
    );
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
    if (fixedBottom?.canvas !== canvases.fixedBottom) {
      if (fixedBottom !== null) {
        release(fixedBottom);
      }
      fixedBottom = canvases.fixedBottom && configure(canvases.fixedBottom);
    }
    setEffectStatus(
      "canvases",
      `scroll ${String(scroll.length)}/${String(canvases.scroll.length)}, fixed ${fixed === null ? "-" : "on"}, fixedBottom ${fixedBottom === null ? "-" : "on"}`,
    );
    sizesChanged = true;
    requestFrame();
  }

  function collectReady() {
    ready = [...renderers.values()].flatMap(({ renderer }) =>
      renderer === null ? [] : [renderer],
    );
    setEffectStatus(
      "renderers",
      `${String(ready.length)} ready of ${String(renderers.size)}`,
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
          noteEffect(`effect setup FAILED: ${describeError(error)}`);
          reportError(error);
        },
      );
    }
    collectReady();
    setEffectStatus(
      "effects",
      `${String(effects.length)} wanted, ${String(ready.length)} ready at setEffects`,
    );
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
    const buffers = [elementBuffer.buffer, scopeBuffer.buffer];
    if (buffers.some((buffer, index) => buffer !== pageBuffers[index])) {
      pageBuffers = buffers;
      pageBindGroup = createPageBindGroup();
    }
    const backdrop = plan.scopes[PAGE_SCOPE].backdrop;
    const backdropChanged =
      pageBackdrop === null ||
      backdrop.some((channel, index) => channel !== pageBackdrop?.[index]);
    pageBackdrop = backdrop;
    return elementsChanged || scopesChanged || backdropChanged;
  }

  function reportCanvasNeeds(plan: ScopePlan) {
    const needs = {
      scroll: plan.document.hasRole,
      fixed: plan.fixed.hasRole,
      fixedBottom: plan.fixedBottom.hasRole,
    };
    if (
      needs.scroll !== canvasNeeds?.scroll ||
      needs.fixed !== canvasNeeds.fixed ||
      needs.fixedBottom !== canvasNeeds.fixedBottom
    ) {
      canvasNeeds = needs;
      onCanvasNeedsChange(needs);
      setEffectStatus("canvas needs", JSON.stringify(needs));
    }
  }

  /**
   * The configured `<canvas>` element of an Effect stage, at this CSS size.
   * A stage's `<canvas>` element is configured the first time a frame lists
   * it, and released once no frame lists it.
   */
  function stageCanvas(
    canvas: HTMLCanvasElement,
    cssWidth: number,
    cssHeight: number,
  ): StageCanvas | null {
    let configured = stageCanvases.get(canvas);
    if (configured === undefined) {
      // A canvas with no size must not be configured: then the device
      // makes an empty texture, which is a validation error.
      sizeCanvas(canvas, cssWidth, cssHeight);
      const fresh = configure(canvas);
      if (fresh === null) {
        return null;
      }
      configured = { ...fresh, cssWidth, cssHeight, seen: false };
      stageCanvases.set(canvas, configured);
    }
    configured.seen = true;
    if (
      configured.cssWidth !== cssWidth ||
      configured.cssHeight !== cssHeight
    ) {
      configured.cssWidth = cssWidth;
      configured.cssHeight = cssHeight;
      sizeCanvas(canvas, cssWidth, cssHeight);
    }
    return configured;
  }

  /**
   * Releases each stage `<canvas>` element that this frame did not list,
   * and empties it, so that it shows nothing of its last frame.
   */
  function releaseUnseenStageCanvases() {
    for (const [canvas, configured] of stageCanvases) {
      if (configured.seen) {
        configured.seen = false;
      } else {
        release(configured);
        stageCanvases.delete(canvas);
        canvas.width = 0;
        canvas.height = 0;
      }
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
    for (const plane of [fixed, fixedBottom]) {
      if (plane !== null) {
        sizeCanvas(plane.canvas, documentWidth, viewport);
      }
    }
  }

  /**
   * Places the scroll `<canvas>` elements and lists this frame's passes.
   * `viewportBottom` is the viewport's bottom edge in viewport coordinates,
   * from which the records fixed to the bottom are placed.
   */
  function planPasses(
    scrollX: number,
    scrollY: number,
    viewportBottom: number,
    plan: ScopePlan,
  ): PassPlan {
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
            stage: -1,
            x: pageLeft,
            y,
            width: documentWidth,
            height: bandHeight,
            firstElement: plan.document.firstElement,
            elementCount: plan.document.elementCount,
            bindGroup: slot.bindGroup,
          },
        });
      }
    }
    function viewportPass(
      configured: ConfiguredCanvas,
      canvas: EffectCanvas,
      y: number,
      range: CanvasRange,
    ): Pass {
      return {
        configured,
        scissor: {
          x: 0,
          y: 0,
          width: configured.canvas.width,
          height: configured.canvas.height,
        },
        drawnPageRange: [y, y + viewport],
        target: {
          canvas,
          band: null,
          stage: -1,
          x: scrollX,
          y,
          width: documentWidth,
          height: viewport,
          firstElement: range.firstElement,
          elementCount: range.elementCount,
          bindGroup: configured.bindGroup,
        },
      };
    }
    if (fixed !== null) {
      passes.push(viewportPass(fixed, "fixed", scrollY, plan.fixed));
    }
    if (fixedBottom !== null) {
      passes.push(
        viewportPass(
          fixedBottom,
          "fixedBottom",
          fixedBottomTop(scrollY, viewportBottom, viewport),
          plan.fixedBottom,
        ),
      );
    }
    function stagePass(
      configured: StageCanvas,
      canvas: EffectCanvas,
      stage: number,
      x: number,
      y: number,
      range: ElementRange,
    ): Pass {
      return {
        configured,
        scissor: {
          x: 0,
          y: 0,
          width: configured.canvas.width,
          height: configured.canvas.height,
        },
        drawnPageRange: [y, y + configured.cssHeight],
        target: {
          canvas,
          band: null,
          stage,
          x,
          y,
          width: configured.cssWidth,
          height: configured.cssHeight,
          firstElement: range.firstElement,
          elementCount: range.elementCount,
          bindGroup: configured.bindGroup,
        },
      };
    }
    const stages: StageFrame[] = [];
    for (const { element, carries, over } of plan.stages) {
      const box = plan.elements[element];
      // The stage's `<canvas>` elements ride inside it, so a transform on
      // it scales them with it: they take the layout size, not the
      // measured one.
      const { width, height } =
        box.element instanceof HTMLElement
          ? { width: box.element.offsetWidth, height: box.element.offsetHeight }
          : box;
      stages.push({ element, width, height });
      const { under: underCanvas, over: overCanvas } = carries.canvases();
      const { rise, depth, spill } = carries.band;
      const under =
        underCanvas &&
        stageCanvas(underCanvas, width + 2 * spill, rise + depth);
      if (under !== null) {
        passes.push(
          stagePass(under, "stageUnder", element, box.x - spill, box.y - rise, {
            firstElement: element,
            elementCount: 1,
          }),
        );
      }
      const above =
        overCanvas && stageCanvas(overCanvas, width + 2 * spill, rise + height);
      if (above !== null) {
        passes.push(
          stagePass(
            above,
            "stageOver",
            element,
            box.x - spill,
            box.y - rise,
            over,
          ),
        );
      }
    }
    releaseUnseenStageCanvases();
    return { passes, stages };
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
    if (canvas.width === 0 || canvas.height === 0) {
      noteEffect(
        `pass on empty canvas ${target.canvas} ${String(canvas.width)}x${String(canvas.height)}`,
      );
    }
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

  let frameCount = 0;
  let drawnCount = 0;
  let frameErrors = 0;

  function renderFrame(now: number) {
    frameCount += 1;
    try {
      renderFrameUnsafe(now);
    } catch (error) {
      frameErrors += 1;
      noteEffect(`frame threw ${describeError(error)}`);
      throw error;
    } finally {
      setEffectStatus(
        "frames",
        `${String(frameCount)} run, ${String(drawnCount)} drawn, ${String(frameErrors)} threw; size ${String(documentWidth)}x${String(viewportHeight)}`,
      );
    }
  }

  function renderFrameUnsafe(now: number) {
    const delta = clock.start(now);
    const { scrollX, scrollY } = window;
    // Read the bottom edge before this frame writes a style, so that the
    // read does not cause one more layout.
    let viewportBottom = fixedBottom === null ? null : readViewportBottom();
    const bottomNow = () => (viewportBottom ??= readViewportBottom());
    const plan = planScopes(
      registry.records(scrollX, scrollY, bottomNow),
      readPageBackdrop(),
    );
    const records = plan.elements;
    const pageChanged = writePage(plan);
    reportCanvasNeeds(plan);
    if (!drawRequested && !pageChanged) {
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

    const { passes, stages } = planPasses(
      scrollX,
      scrollY,
      viewportBottom ?? 0,
      plan,
    );
    const viewport = bandGeometry(viewportHeight).viewport;
    const frame: EffectFrame = {
      time: (now - startTime) / 1000,
      delta,
      reducedMotion: reducedMotionQuery.matches,
      viewport: {
        x: scrollX,
        y: scrollY,
        width: documentWidth,
        height: viewport,
      },
      documentHeight,
      elements: records,
      scopes: plan.scopes,
      stages,
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
    drawnCount += 1;
    setEffectStatus(
      "last frame",
      `${String(passes.length)} passes [${[...new Set(passes.map(({ target }) => target.canvas))].join(",")}], ${String(records.length)} elements, ${String(stages.length)} stages, ${String(ready.length)} renderers`,
    );
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
    for (const plane of [fixed, fixedBottom]) {
      if (plane !== null) {
        release(plane);
      }
    }
    for (const configured of stageCanvases.values()) {
      release(configured);
    }
    stageCanvases.clear();
    scroll = [];
    fixed = null;
    fixedBottom = null;
    pageUniform.destroy();
    elementBuffer.destroy();
    scopeBuffer.destroy();
  }

  return { setCanvases, setEffects, destroy };
}
