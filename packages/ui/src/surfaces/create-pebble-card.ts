import {
  GPU_BUFFER_USAGE,
  GPU_SHADER_STAGE,
} from "../effect-layer/constants.ts";
import { readEffectLayerMode } from "../effect-layer/read-effect-layer-mode.ts";
import { PEBBLE_CARD_WGSL } from "./pebble-card-wgsl.ts";

/**
 * The dials of the pebble card: how far in from the outline the face
 * curves, in CSS px; how strongly the curve reflects the studio and the
 * crisp line, as shares of the default; and the tilt at its largest, in
 * degrees, as the card comes and goes and under a drag. 0 keeps the card
 * flat.
 *
 * @internal
 */
export interface PebbleCardDials {
  readonly curve: number;
  readonly reflection: number;
  readonly specular: number;
  readonly tilt: number;
}

/** @internal */
export const PEBBLE_CARD_DEFAULTS: PebbleCardDials = {
  curve: 14,
  reflection: 1,
  specular: 1,
  tilt: 4,
};

const PERSPECTIVE = 900;
const OPEN_MS = 1000;
// The card holds its full tilt this long while it moves fastest.
const OPEN_HOLD_MS = 120;
const FRAME_MS = 1000 / 60;
// The canvas reaches this far past the card, in CSS px, for the smooth
// outline.
const MARGIN = 2;
// The drag's speed, in px per ms, that gives about three quarters of the
// tilt, and the pull, in px, that adds its share.
const DRAG_SPEED = 0.8;
const DRAG_PULL = 260;
const PULL_SHARE = 0.2;
// The spring that smooths the tilt under a drag, and the looser one that
// takes it back to flat, a little past flat and back, after the drag.
const FOLLOW = { omega: 20, zeta: 0.85 };
const RETURN = { omega: 11, zeta: 0.42 };
// How bright the studio is over a dark card, and the share of the crisp
// line it keeps, so that the dark glass stays quiet.
const DARK_STUDIO = 0.11;
// Over a light card the glass can only darken, so the studio shows a
// little stronger there, or the crisp line would not read.
const LIGHT_REFLECTION = 1.3;
const DARK_SPECULAR = 0.7;
const TILT = "--pebble-tilt";
const LIVE_ANGLE = `calc(var(${TILT}, 0) * 1deg)`;

interface Gpu {
  readonly device: GPUDevice;
  readonly format: GPUTextureFormat;
  readonly pipeline: GPURenderPipeline;
  readonly uniforms: GPUBuffer;
  readonly group: GPUBindGroup;
}

let gpuPromise: Promise<Gpu | null> | null = null;

async function requestGpu(): Promise<Gpu | null> {
  if (!("gpu" in navigator)) return null;
  try {
    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: "low-power",
    });
    if (!adapter) return null;
    const device = await adapter.requestDevice();
    const format = navigator.gpu.getPreferredCanvasFormat();
    const module = device.createShaderModule({ code: PEBBLE_CARD_WGSL });
    const layout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPU_SHADER_STAGE.FRAGMENT,
          buffer: { type: "uniform" },
        },
      ],
    });
    const pipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [layout] }),
      vertex: { module, entryPoint: "vs" },
      fragment: { module, entryPoint: "fs", targets: [{ format }] },
      primitive: { topology: "triangle-list" },
    });
    const uniforms = device.createBuffer({
      size: 5 * 16,
      usage: GPU_BUFFER_USAGE.UNIFORM | GPU_BUFFER_USAGE.COPY_DST,
    });
    const group = device.createBindGroup({
      layout,
      entries: [{ binding: 0, resource: { buffer: uniforms } }],
    });
    return { device, format, pipeline, uniforms, group };
  } catch {
    return null;
  }
}

function parseColor(value: string): [number, number, number] {
  const numbers = value.match(/[\d.]+/g)?.map(Number) ?? [];
  const [r = 255, g = 255, b = 255] = numbers;
  return [r / 255, g / 255, b / 255];
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
}

/**
 * The tilt as the card comes in, as a share of the full tilt, `ms` after
 * the start: it holds, then a damped spring takes it to flat, a little
 * past flat and back.
 */
function openShare(ms: number, hold = OPEN_HOLD_MS) {
  const t = Math.max(ms - hold, 0) / 1000;
  const zeta = 0.55;
  const damped = 5.98;
  const decay = (zeta * damped) / Math.sqrt(1 - zeta * zeta);
  const spring =
    Math.exp(-decay * t) *
    (Math.cos(damped * t) + (decay / damped) * Math.sin(damped * t));
  return spring * (1 - smoothstep(0.75 * OPEN_MS, OPEN_MS, ms));
}

/**
 * The tilt about the card's middle, top towards the viewer, seen from
 * above the middle of the card's top edge. `angle` is a CSS angle, and
 * `inset` is where the card's top-left corner is in the element.
 */
function tiltTransform(
  angle: string,
  width: number,
  height: number,
  inset = 0,
) {
  const cx = String(width / 2 + inset);
  const cy = String(height / 2 + inset);
  return (
    `translate(${cx}px, ${String(inset)}px) ` +
    `perspective(${String(PERSPECTIVE)}px) ` +
    `translate(0px, ${String(height / 2)}px) rotateX(calc(-1 * ${angle})) ` +
    `translate(-${cx}px, -${cy}px)`
  );
}

/**
 * What a drag is doing now: its speed, in px per ms, down positive, and how
 * far down it has taken the card, in px.
 *
 * @internal
 */
export interface DragFeel {
  readonly velocity: number;
  readonly pull: number;
}

interface Scene {
  readonly card: HTMLElement;
  readonly mover: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly context: GPUCanvasContext;
  readonly resize: ResizeObserver;
  readonly theme: MutationObserver;
  readonly scheme: MediaQueryList;
  readonly onScheme: () => void;
  dials: PebbleCardDials;
  width: number;
  height: number;
  top: number;
  bottom: number;
  exponent: number;
  base: [number, number, number];
  isDark: boolean;
  /** The tilt, in degrees, past which the card would grow wider than the screen. */
  limit: number;
}

interface Keys {
  readonly animations: readonly Animation[];
  readonly samples: readonly number[];
  readonly duration: number;
}

interface Live {
  angle: number;
  speed: number;
  time: number;
  /** What the drag is doing, or `null` once the drag lets go. */
  feel: (() => DragFeel) | null;
}

/**
 * Lays pebble glass over a Sheet's card: the card's face curves down over
 * its last few px and reflects a soft studio. A canvas over the card draws
 * the glass, inside the card's mover, so it moves with the card. The card
 * tilts a little as it comes and goes, and as a drag moves it, so that the
 * reflections flow over the curve; the canvas takes the same tilt as the
 * card, from the same keyframes or the same CSS variable, so the curve
 * stays on the card's edge. The tilt that the shader lights with comes
 * from the same keyframes or spring.
 *
 * @internal
 */
export function createPebbleCard() {
  let gpu: Gpu | null = null;
  let scene: Scene | null = null;
  let keys: Keys | null = null;
  let live: Live | null = null;
  let frame = 0;

  function warm() {
    gpuPromise ??= requestGpu();
    void gpuPromise.then((ready) => {
      gpu = ready;
    });
  }

  function canDraw() {
    if (window.matchMedia("(forced-colors: active)").matches) return false;
    return gpu !== null && readEffectLayerMode() !== "off";
  }

  function tilted(current: Scene) {
    return Math.min(current.dials.tilt, current.limit);
  }

  /** The tilt now, in degrees. */
  function degreesNow() {
    if (live) return live.angle;
    if (!keys) return 0;
    const time = Number(keys.animations[0]?.currentTime ?? 0);
    const at =
      (Math.min(Math.max(time, 0), keys.duration) / keys.duration) *
      (keys.samples.length - 1);
    const index = Math.min(Math.floor(at), keys.samples.length - 2);
    const from = keys.samples[index] ?? 0;
    const to = keys.samples[index + 1] ?? from;
    return from + (to - from) * (at - index);
  }

  function measure(current: Scene) {
    const { card, canvas } = current;
    const style = getComputedStyle(card);
    current.width = card.offsetWidth;
    current.height = card.offsetHeight;
    current.top = Number.parseFloat(style.borderTopLeftRadius) || 0;
    current.bottom = Number.parseFloat(style.borderBottomLeftRadius) || 0;
    current.base = parseColor(style.backgroundColor);
    const [r, g, b] = current.base;
    current.isDark = 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.4;
    const screen = document.documentElement.clientWidth;
    const room =
      (2 * PERSPECTIVE * (1 - current.width / screen)) / current.height;
    current.limit =
      room <= 0 ? 0 : (Math.asin(Math.min(room, 1)) * 180) / Math.PI;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const cssWidth = current.width + 2 * MARGIN;
    const cssHeight = current.height + 2 * MARGIN;
    canvas.style.width = `${String(cssWidth)}px`;
    canvas.style.height = `${String(cssHeight)}px`;
    canvas.width = Math.max(1, Math.round(cssWidth * dpr));
    canvas.height = Math.max(1, Math.round(cssHeight * dpr));
  }

  function redraw() {
    if (!scene) return;
    measure(scene);
    if (frame === 0) draw(scene);
  }

  function attach(card: HTMLElement, dials: PebbleCardDials) {
    if (scene?.card === card) {
      scene.dials = dials;
      return scene;
    }
    detach();
    const mover = card.parentElement;
    if (!gpu || !mover) return null;
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, {
      position: "absolute",
      left: `${String(card.offsetLeft - MARGIN)}px`,
      top: `${String(card.offsetTop - MARGIN)}px`,
      display: "block",
      pointerEvents: "none",
      transformOrigin: "0 0",
    });
    const context = canvas.getContext("webgpu");
    if (!(context instanceof GPUCanvasContext)) return null;
    context.configure({
      device: gpu.device,
      format: gpu.format,
      alphaMode: "premultiplied",
    });
    mover.insertBefore(canvas, card.nextSibling);
    const resize = new ResizeObserver(redraw);
    resize.observe(card);
    // A change of theme changes the card's colour.
    const theme = new MutationObserver(() => {
      requestAnimationFrame(redraw);
    });
    theme.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "style"],
    });
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    const onScheme = () => {
      requestAnimationFrame(redraw);
    };
    scheme.addEventListener("change", onScheme);
    const next: Scene = {
      card,
      mover,
      canvas,
      context,
      resize,
      theme,
      scheme,
      onScheme,
      dials,
      width: 0,
      height: 0,
      top: 0,
      bottom: 0,
      exponent: CSS.supports("corner-shape", "squircle") ? 4 : 2,
      base: [1, 1, 1],
      isDark: false,
      limit: 0,
    };
    scene = next;
    measure(next);
    return next;
  }

  /** Takes the tilt off and leaves the card flat, with its glass. */
  function flatten() {
    if (frame !== 0) cancelAnimationFrame(frame);
    frame = 0;
    for (const animation of keys?.animations ?? []) animation.cancel();
    keys = null;
    live = null;
    if (!scene) return;
    for (const element of [scene.card, scene.canvas]) {
      element.style.transform = "";
    }
    scene.card.style.transformOrigin = "";
    scene.mover.style.removeProperty(TILT);
  }

  function detach() {
    flatten();
    if (!scene) return;
    scene.resize.disconnect();
    scene.theme.disconnect();
    scene.scheme.removeEventListener("change", scene.onScheme);
    scene.canvas.remove();
    scene.context.unconfigure();
    scene = null;
  }

  function startKeys(
    current: Scene,
    duration: number,
    degrees: (ms: number) => number,
  ) {
    flatten();
    if (typeof current.card.animate !== "function") return;
    const count = Math.max(2, Math.ceil(duration / FRAME_MS) + 1);
    const samples = Array.from({ length: count }, (_, index) =>
      degrees((index / (count - 1)) * duration),
    );
    const timing = { duration, easing: "linear", fill: "forwards" } as const;
    current.card.style.transformOrigin = "0 0";
    const tiltKeys = (inset: number) =>
      samples.map((value) => ({
        transform: tiltTransform(
          `${String(value)}deg`,
          current.width,
          current.height,
          inset,
        ),
      }));
    const animations = [
      current.card.animate(tiltKeys(0), timing),
      current.canvas.animate(tiltKeys(MARGIN), timing),
    ];
    keys = { animations, samples, duration };
    const started = keys;
    animations[0]?.addEventListener("finish", () => {
      if (keys !== started) return;
      flatten();
      draw(current);
    });
    tick(performance.now());
  }

  function dragTarget(current: Scene, feel: DragFeel) {
    const velocity = feel.velocity < 0 ? feel.velocity * 0.5 : feel.velocity;
    const share =
      (1 - PULL_SHARE) * Math.tanh(velocity / DRAG_SPEED) +
      PULL_SHARE * Math.tanh(feel.pull / DRAG_PULL);
    return tilted(current) * share;
  }

  /** Moves the live tilt one frame along its spring; `false` once it rests. */
  function step(current: Scene, state: Live, now: number) {
    const dt = Math.min(Math.max(now - state.time, 0), 50) / 1000;
    state.time = now;
    const target = state.feel ? dragTarget(current, state.feel()) : 0;
    const { omega, zeta } = state.feel ? FOLLOW : RETURN;
    const substeps = Math.max(1, Math.ceil(dt / 0.008));
    const h = dt / substeps;
    for (let index = 0; index < substeps; index++) {
      const accel =
        omega * omega * (target - state.angle) - 2 * zeta * omega * state.speed;
      state.speed += accel * h;
      state.angle += state.speed * h;
    }
    const limit = current.limit;
    state.angle = Math.min(Math.max(state.angle, -limit), limit);
    current.mover.style.setProperty(TILT, String(state.angle));
    return !(
      !state.feel &&
      Math.abs(state.angle) < 0.02 &&
      Math.abs(state.speed) < 0.3
    );
  }

  function tick(now: number) {
    frame = 0;
    const current = scene;
    if (!current) return;
    if (live && !step(current, live, now)) {
      flatten();
      draw(current);
      return;
    }
    draw(current);
    if (live || keys) frame = requestAnimationFrame(tick);
  }

  function draw(current: Scene) {
    if (!gpu) return;
    const { dials, isDark } = current;
    const dpr = current.canvas.width / (current.width + 2 * MARGIN);
    const data = new Float32Array([
      current.width + 2 * MARGIN,
      current.height + 2 * MARGIN,
      MARGIN,
      dpr,
      current.width,
      current.height,
      current.top,
      current.bottom,
      (degreesNow() * Math.PI) / 180,
      PERSPECTIVE,
      current.exponent,
      dials.curve,
      ...current.base,
      0,
      dials.reflection * (isDark ? 1 : LIGHT_REFLECTION),
      dials.specular * (isDark ? DARK_SPECULAR : 1),
      isDark ? DARK_STUDIO : 1,
      0,
    ]);
    try {
      gpu.device.queue.writeBuffer(gpu.uniforms, 0, data);
      const encoder = gpu.device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: current.context.getCurrentTexture().createView(),
            loadOp: "clear",
            storeOp: "store",
            clearValue: [0, 0, 0, 0],
          },
        ],
      });
      pass.setPipeline(gpu.pipeline);
      pass.setBindGroup(0, gpu.group);
      pass.draw(3);
      pass.end();
      gpu.device.queue.submit([encoder.finish()]);
    } catch (error) {
      console.warn("pebble card", error);
    }
  }

  return {
    warm,
    canDraw,
    /**
     * Lays the glass on the card as it comes in, and tilts it as it comes
     * unless `canTilt` is false. An open that interrupts a tilt goes on
     * from that tilt.
     */
    open(card: HTMLElement, dials: PebbleCardDials, canTilt: boolean) {
      const from = degreesNow();
      const current = attach(card, dials);
      if (!current) return;
      const tilt = tilted(current);
      if (!canTilt || (tilt <= 0 && Math.abs(from) < 0.05)) {
        flatten();
        draw(current);
        return;
      }
      if (Math.abs(from) < 0.05) {
        startKeys(current, OPEN_MS, (ms) => tilt * openShare(ms));
        return;
      }
      startKeys(current, OPEN_MS, (ms) => from * openShare(ms, 0));
    },
    /** Tilts the card as it goes, unless `canTilt` is false. */
    close(
      card: HTMLElement,
      dials: PebbleCardDials,
      duration: number,
      canTilt: boolean,
    ) {
      if (live) {
        live.feel = null;
        return;
      }
      const current = attach(card, dials);
      if (!current || !canTilt) return;
      const from = degreesNow();
      const tilt = tilted(current);
      if (tilt <= 0 && Math.abs(from) < 0.05) return;
      startKeys(
        current,
        duration,
        (ms) => from + (tilt - from) * smoothstep(0, 0.7 * duration, ms),
      );
    },
    /** Tilts the card with a drag until `release`. */
    follow(card: HTMLElement, dials: PebbleCardDials, feel: () => DragFeel) {
      const from = degreesNow();
      const speed = live?.speed ?? 0;
      const current = attach(card, dials);
      if (!current || tilted(current) <= 0) return;
      flatten();
      current.card.style.transformOrigin = "0 0";
      current.mover.style.setProperty(TILT, String(from));
      current.card.style.transform = tiltTransform(
        LIVE_ANGLE,
        current.width,
        current.height,
      );
      current.canvas.style.transform = tiltTransform(
        LIVE_ANGLE,
        current.width,
        current.height,
        MARGIN,
      );
      live = { angle: from, speed, time: performance.now(), feel };
      tick(performance.now());
    },
    /** Lets the tilt of a drag spring back to flat. */
    release() {
      if (live) live.feel = null;
    },
    /** Takes in new dials and draws with them. */
    tune(dials: PebbleCardDials) {
      if (!scene) return;
      scene.dials = dials;
      if (frame === 0) draw(scene);
    },
    /** Takes the glass off the card. */
    detach,
  };
}

/** @internal */
export type PebbleCard = ReturnType<typeof createPebbleCard>;
