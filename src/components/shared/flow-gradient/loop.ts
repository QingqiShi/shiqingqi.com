import type { ProgramInfo, Arrays, BufferInfo } from "twgl.js";
import {
  createProgramInfo,
  createBufferInfoFromArrays,
  setBuffersAndAttributes,
  resizeCanvasToDisplaySize,
  drawBufferInfo,
  setUniforms,
} from "twgl.js";
import { createMesh } from "./primitives";

interface Context {
  gl: WebGLRenderingContext;
  programInfo: ProgramInfo;
  canvas: HTMLCanvasElement;
}

function getWebGLContext(
  canvas: HTMLCanvasElement
): WebGLRenderingContext | undefined {
  const context = canvas.getContext("webgl2", {
    premultipliedAlpha: false,
  });
  return context ?? undefined;
}

export function init(
  canvas: HTMLCanvasElement,
  vertexShaderSrc: string,
  fragmentShaderSrc: string
): Context | undefined {
  const gl = getWebGLContext(canvas);
  if (!gl) {
    return;
  }

  const programInfo = createProgramInfo(gl, [
    vertexShaderSrc,
    fragmentShaderSrc,
  ]);

  gl.useProgram(programInfo.program);

  return { gl, programInfo, canvas };
}

function getBufferInfo(
  { gl, programInfo }: Context,
  width: number,
  height: number
) {
  const mesh = createMesh(width, height, 10);
  const arrays: Arrays = {
    a_position: {
      numComponents: 2,
      data: mesh,
    },
  };
  const bufferInfo = createBufferInfoFromArrays(gl, arrays);
  setBuffersAndAttributes(gl, programInfo, bufferInfo);
  return bufferInfo;
}

function computeDPI(width: number): number {
  const dpr = window.devicePixelRatio;
  const breakpoints = [768, 1080, 2000].map((bp) => bp * dpr);

  // For each breakpoint we compute a different DPI factor to make the flowing
  // gradient look good.
  const offsets = [
    // md offset
    width / breakpoints[0] - 1,
    // lg offset
    breakpoints[1] / breakpoints[0] - 1 + (width / breakpoints[1] - 1),
    // xl offset
    breakpoints[1] / breakpoints[0] -
      1 +
      (breakpoints[2] / breakpoints[1] - 1) +
      (width / breakpoints[2] - 1),
  ];

  // Return the correct computed DPI factor based on the width
  if (width < breakpoints[0]) return dpr;
  if (width < breakpoints[1]) return dpr + offsets[0];
  if (width < breakpoints[2]) return dpr + offsets[1];
  return dpr + offsets[2];
}

interface PointerState {
  mousePosition: [number, number];
  rippleStrength: number;
  rippleStrengthTarget: number;
  ripplePhase: number;
}

function setupPointerEvents(
  canvas: HTMLCanvasElement,
  signal: AbortSignal
): PointerState {
  const pointerState: PointerState = {
    mousePosition: [0, 0],
    rippleStrength: 1,
    rippleStrengthTarget: 1,
    ripplePhase: 0,
  };

  document.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType !== "mouse") return;
      pointerState.mousePosition = [
        e.clientX * window.devicePixelRatio,
        e.clientY * window.devicePixelRatio +
          document.documentElement.scrollTop * window.devicePixelRatio,
      ];
    },
    { signal, passive: true }
  );

  document.addEventListener(
    "pointerdown",
    (e) => {
      if (
        e.pointerType === "touch" ||
        (e.pointerType === "mouse" && e.button !== 0)
      ) {
        return;
      }
      pointerState.rippleStrengthTarget = 1.5;
    },
    { signal }
  );

  document.addEventListener(
    "pointerup",
    (e) => {
      if (
        e.pointerType === "touch" ||
        (e.pointerType === "mouse" && e.button !== 0)
      ) {
        return;
      }
      pointerState.rippleStrengthTarget = 1;
    },
    { signal }
  );

  return pointerState;
}

function createAnimationLoop({
  render,
  fps = 30,
  signal,
}: {
  render: (time: number) => void;
  fps?: number;
  signal?: AbortSignal;
}) {
  let animationId: number | null = null;
  let lastFrameTime = performance.now();
  const frameDuration = 1000 / fps;
  const startTime = performance.now();

  const handleFrame: FrameRequestCallback = (timestamp) => {
    if (signal?.aborted) return;

    const elapsed = timestamp - lastFrameTime;
    if (elapsed >= frameDuration) {
      lastFrameTime = timestamp - (elapsed % frameDuration);
      render(timestamp - startTime);
    }

    animationId = requestAnimationFrame(handleFrame);
  };

  animationId = requestAnimationFrame(handleFrame);

  return () => {
    if (animationId !== null) cancelAnimationFrame(animationId);
  };
}

interface Options {
  colorTop?: [number, number, number];
  colorBottom?: [number, number, number];
  colorAltTop?: [number, number, number];
  colorAltBottom?: [number, number, number];
  colorBackground?: [number, number, number];
  amplitudes?: {
    mobile: number;
    tablet: number;
    laptop: number;
    desktop: number;
  };
}

export function start(
  { gl, programInfo, canvas }: Context,
  {
    colorTop = [0, 0, 0.2],
    colorBottom = [0, 0, 0.8],
    colorAltTop = [1, 0, 0],
    colorAltBottom = [1, 0, 0],
    colorBackground = [0.953, 0.929, 0.929],
  }: Options
) {
  const abortController = new AbortController();

  const startTime = performance.now();

  // Resize canvas
  let resized = false;
  const observer = new ResizeObserver(() => {
    resized = resizeCanvasToDisplaySize(canvas, window.devicePixelRatio);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    render(performance.now() - startTime);
  });
  observer.observe(canvas);

  // Ripple effect mouse tracking
  const pointerState = setupPointerEvents(canvas, abortController.signal);

  let bufferInfo: BufferInfo | undefined;
  let lastTimestamp = 0;
  const render = (timestamp: number) => {
    const deltaTime = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    // Re-create buffer info when canvas resized to re-create mesh
    if (resized || !bufferInfo) {
      bufferInfo = getBufferInfo(
        { gl, programInfo, canvas },
        gl.canvas.width,
        gl.canvas.height
      );
      resized = false;
    }

    const rippleSpeed = 5; // 1 / 0.2s = 5
    pointerState.rippleStrength +=
      (pointerState.rippleStrengthTarget - pointerState.rippleStrength) *
      rippleSpeed *
      deltaTime;
    pointerState.rippleStrength =
      Math.floor(pointerState.rippleStrength * 1000) / 1000;

    pointerState.ripplePhase +=
      rippleSpeed * deltaTime * pointerState.rippleStrength * 1.5;
    pointerState.ripplePhase =
      Math.floor(pointerState.ripplePhase * 1000) / 1000;

    const uniforms = {
      u_resolution: [gl.canvas.width, gl.canvas.height],
      u_dpi: computeDPI(gl.canvas.width),
      u_time: timestamp,
      u_colorTop: colorTop,
      u_colorBottom: colorBottom,
      u_colorAltTop: colorAltTop,
      u_colorAltBottom: colorAltBottom,
      u_colorBackground: colorBackground,
      u_mouse: pointerState.mousePosition,
      u_rippleStrength: pointerState.rippleStrength,
      u_ripplePhase: pointerState.ripplePhase,
    };
    setUniforms(programInfo, uniforms);

    drawBufferInfo(gl, bufferInfo);
  };

  const cancelAnimation = createAnimationLoop({
    render,
    signal: abortController.signal,
    fps: 60,
  });

  return () => {
    cancelAnimation();
    observer.disconnect();
    abortController.abort();
  };
}
