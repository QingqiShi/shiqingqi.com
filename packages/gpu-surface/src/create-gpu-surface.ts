import { MOTION_STALE_MS, RESIZE_SETTLE_MS } from "./constants.ts";
import { createBandDriver, type BandStats } from "./create-band-driver.ts";
import { parseCssColor, type Rgba } from "./parse-css-color.ts";
import { resolveProbes, type ProbedViewports } from "./resolve-probes.ts";

/**
 * - `pending`: the band has not drawn its first frame.
 * - `ready`: the band shows what it drew.
 * - `lost`: the browser took the WebGL context away. The band is hidden
 *   until the context comes back and the band draws again.
 * - `failed`: the band cannot draw, and stays hidden. The page shows what it
 *   shows without the GPU surface.
 */
export type GpuSurfaceState = "pending" | "ready" | "lost" | "failed";

export interface GpuSurfaceOptions {
  /**
   * The colour the band is cleared to: any CSS `<color>`, such as
   * `var(--token)`. It resolves where the band is, so a `light-dark()` value
   * follows the page's colour scheme.
   */
  clearColor: string;
}

export interface GpuSurface {
  /** The `<canvas>` element. Its `data-state` attribute holds the state. */
  readonly canvas: HTMLCanvasElement;
  readonly state: GpuSurfaceState;
  stats(): BandStats;
  /** Removes the `<canvas>` element and every listener, and frees the context. */
  destroy(): void;
}

const CONTEXT_ATTRIBUTES: WebGLContextAttributes = {
  alpha: false,
  antialias: false,
  depth: false,
  stencil: false,
  premultipliedAlpha: true,
  preserveDrawingBuffer: false,
};

function getWebGl2Context(canvas: HTMLCanvasElement) {
  try {
    return canvas.getContext("webgl2", CONTEXT_ATTRIBUTES);
  } catch {
    return null;
  }
}

function hiddenProbe(doc: Document, height: string) {
  const probe = doc.createElement("div");
  probe.style.height = height;
  return probe;
}

/**
 * Puts the GPU surface's band behind the page: a `<canvas>` element at the
 * end of `<body>`, in the document's flow coordinates, that moves as the page
 * scrolls so it always covers the visible area. Call it in the browser only,
 * after hydration.
 */
export function createGpuSurface({
  clearColor,
}: GpuSurfaceOptions): GpuSurface {
  const doc = document;
  const win = window;
  const root = doc.documentElement;
  const body = doc.body;

  const canvas = doc.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "absolute",
    top: "0px",
    left: "0px",
    // Under all the in-flow content of `<body>`, but over the root background.
    zIndex: "-1",
    display: "block",
    pointerEvents: "none",
    // An opaque context shows black until the first draw.
    visibility: "hidden",
  });

  // The probes are in an empty box that clips them, so a `100lvh` probe
  // cannot make a short document taller.
  const probes = doc.createElement("div");
  probes.setAttribute("aria-hidden", "true");
  Object.assign(probes.style, {
    position: "absolute",
    top: "0px",
    left: "0px",
    width: "0px",
    height: "0px",
    overflow: "hidden",
    visibility: "hidden",
    pointerEvents: "none",
  });
  const largeProbe = hiddenProbe(doc, "100lvh");
  const smallProbe = hiddenProbe(doc, "100svh");
  const colorProbe = doc.createElement("div");
  colorProbe.style.setProperty("background-color", clearColor);
  probes.append(largeProbe, smallProbe, colorProbe);
  body.append(probes, canvas);

  let state: GpuSurfaceState = "pending";
  let destroyed = false;
  const driver = createBandDriver();
  const listening = new AbortController();
  const observers: { disconnect(): void }[] = [];
  let forcedColors: MediaQueryList | null = null;
  let frameId = 0;
  let settleTimer = 0;
  let restTimer = 0;
  let probed: ProbedViewports = { large: 0, small: 0 };
  let innerHeight = win.innerHeight;
  // Where the containing block of the band starts in the document, and what
  // the band's `left` and `top` hold now.
  let origin = { left: 0, top: 0 };
  let placed = { left: 0, top: 0 };
  let color: Rgba | null = null;
  let measurePending = true;
  let colorPending = true;
  let drawPending = true;

  function show() {
    const visible = state === "ready" && forcedColors?.matches !== true;
    canvas.style.visibility = visible ? "" : "hidden";
  }

  function setState(next: GpuSurfaceState) {
    state = next;
    canvas.dataset.state = next;
    show();
  }

  function stop() {
    listening.abort();
    for (const observer of observers) observer.disconnect();
    win.cancelAnimationFrame(frameId);
    win.clearTimeout(settleTimer);
    win.clearTimeout(restTimer);
    frameId = 0;
  }

  const gl = getWebGl2Context(canvas);

  function release() {
    stop();
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  }

  function fail() {
    setState("failed");
    release();
    probes.remove();
  }

  const surface: GpuSurface = {
    canvas,
    get state() {
      return state;
    },
    stats: () => driver.stats(),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      release();
      canvas.remove();
      probes.remove();
    },
  };

  setState("pending");
  if (gl === null) {
    fail();
    return surface;
  }

  function measure() {
    measurePending = false;
    const rect = canvas.getBoundingClientRect();
    origin = {
      left: rect.left + win.scrollX - placed.left,
      top: rect.top + win.scrollY - placed.top,
    };
    innerHeight = win.innerHeight;
    probed = resolveProbes(probed, {
      large: largeProbe.offsetHeight,
      small: smallProbe.offsetHeight,
      innerHeight,
    });
    driver.measure({
      viewportWidth: root.clientWidth,
      probed,
      docHeight: Math.max(
        root.clientHeight,
        body.getBoundingClientRect().bottom + win.scrollY,
      ),
      scale: win.devicePixelRatio || 1,
    });
  }

  function readColor() {
    colorPending = false;
    const next = parseCssColor(
      win.getComputedStyle(colorProbe).backgroundColor,
    );
    if (next === null || next.a < 1) return false;
    if (
      color === null ||
      color.r !== next.r ||
      color.g !== next.g ||
      color.b !== next.b
    ) {
      color = next;
      drawPending = true;
    }
    return true;
  }

  function draw(context: WebGL2RenderingContext, rgba: Rgba) {
    drawPending = false;
    context.viewport(
      0,
      0,
      context.drawingBufferWidth,
      context.drawingBufferHeight,
    );
    context.clearColor(rgba.r, rgba.g, rgba.b, 1);
    context.clear(context.COLOR_BUFFER_BIT);
  }

  function runFrame() {
    win.cancelAnimationFrame(frameId);
    frameId = 0;
    if (gl === null || destroyed || state === "failed" || gl.isContextLost()) {
      return;
    }
    if (measurePending) measure();
    if (colorPending && !readColor()) {
      fail();
      return;
    }
    const frame = driver.frame(win.scrollY);
    if (frame === null || color === null) return;
    const { box } = frame;
    if (frame.resized) {
      // Setting either size clears the drawing buffer, even to the same value.
      if (canvas.width !== box.pixelWidth) canvas.width = box.pixelWidth;
      if (canvas.height !== box.pixelHeight) canvas.height = box.pixelHeight;
      canvas.style.width = `${String(box.width)}px`;
      canvas.style.height = `${String(box.height)}px`;
    }
    const next = { left: -origin.left, top: box.top - origin.top };
    if (next.left !== placed.left) canvas.style.left = `${String(next.left)}px`;
    if (next.top !== placed.top) canvas.style.top = `${String(next.top)}px`;
    placed = next;
    if (frame.resized || frame.moved || drawPending) draw(gl, color);
    if (state !== "ready") setState("ready");
  }

  function requestFrame() {
    if (frameId !== 0 || destroyed || state === "failed") return;
    frameId = win.requestAnimationFrame(runFrame);
  }

  function remeasure() {
    measurePending = true;
    requestFrame();
  }

  function recolor() {
    colorPending = true;
    requestFrame();
  }

  const { signal } = listening;

  canvas.addEventListener(
    "webglcontextlost",
    (event) => {
      // Without this, the browser never gives the context back.
      event.preventDefault();
      win.cancelAnimationFrame(frameId);
      frameId = 0;
      setState("lost");
    },
    { signal },
  );
  canvas.addEventListener(
    "webglcontextrestored",
    () => {
      driver.reset();
      remeasure();
      recolor();
    },
    { signal },
  );

  // Reading the viewport here flushes layout, but reading the probes would
  // flush it again for each step of a URL bar animation. Thus the test is
  // the probed range from the last measurement.
  function onViewportEvent() {
    const reading = { width: root.clientWidth, innerHeight: win.innerHeight };
    innerHeight = reading.innerHeight;
    const kind = driver.classifyViewport(reading);
    if (kind === "url-bar") return;
    win.clearTimeout(settleTimer);
    settleTimer = 0;
    if (kind === "width") {
      remeasure();
      return;
    }
    settleTimer = win.setTimeout(() => {
      settleTimer = 0;
      remeasure();
    }, RESIZE_SETTLE_MS);
  }
  win.addEventListener("resize", onViewportEvent, { signal });
  win.visualViewport?.addEventListener("resize", onViewportEvent, { signal });

  win.addEventListener(
    "scroll",
    () => {
      if (driver.scroll(win.scrollY, innerHeight, win.performance.now())) {
        requestFrame();
      }
      win.clearTimeout(restTimer);
      restTimer = win.setTimeout(() => {
        restTimer = 0;
        if (driver.rest(win.scrollY)) requestFrame();
      }, MOTION_STALE_MS);
    },
    { passive: true, signal },
  );

  win.addEventListener(
    "pageshow",
    (event) => {
      if (!event.persisted) return;
      remeasure();
      recolor();
    },
    { signal },
  );

  win
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", recolor, { signal });
  forcedColors = win.matchMedia("(forced-colors: active)");
  forcedColors.addEventListener("change", show, { signal });

  function watchResolution() {
    win
      .matchMedia(`(resolution: ${String(win.devicePixelRatio || 1)}dppx)`)
      .addEventListener(
        "change",
        () => {
          remeasure();
          watchResolution();
        },
        { once: true, signal },
      );
  }
  watchResolution();

  // The theme switch writes the whole `class` attribute of `<html>`. Thus
  // the runtime keeps no state there, and reads the colour again on each
  // write.
  const themeObserver = new MutationObserver(recolor);
  themeObserver.observe(root, { attributes: true, attributeFilter: ["class"] });
  observers.push(themeObserver);

  // A resize observer runs after layout and before paint. Thus a document
  // that becomes shorter gets a band that fits it in the same frame, and the
  // band never makes the document taller.
  const bodyObserver = new ResizeObserver(() => {
    measurePending = true;
    runFrame();
  });
  bodyObserver.observe(body);
  observers.push(bodyObserver);

  requestFrame();
  return surface;
}
