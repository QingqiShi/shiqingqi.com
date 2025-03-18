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

export function init(
  canvas: HTMLCanvasElement,
  vertexShaderSrc: string,
  fragmentShaderSrc: string
): Context | undefined {
  const gl = canvas.getContext("webgl2", {
    premultipliedAlpha: false,
  });
  if (!gl) return;

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

  // Mouse position
  let mousePosition = [0, 0];
  document.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType === "touch") return;

      mousePosition = [
        e.clientX * window.devicePixelRatio,
        e.clientY * window.devicePixelRatio +
          document.documentElement.scrollTop * window.devicePixelRatio,
      ];
      render(performance.now() - startTime);
    },
    { signal: abortController.signal, passive: true }
  );

  // Mouse up and down to increase ripple effect strength
  let rippleStrength = 1;
  let rippleStrengthTarget = 1;
  let ripplePhase = 0;
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (
        e.pointerType === "touch" ||
        (e.pointerType === "mouse" && e.button !== 0)
      )
        return;
      rippleStrengthTarget = 1.5;
    },
    { signal: abortController.signal }
  );
  document.addEventListener(
    "pointerup",
    (e) => {
      if (
        e.pointerType === "touch" ||
        (e.pointerType === "mouse" && e.button !== 0)
      )
        return;
      rippleStrengthTarget = 1;
    },
    { signal: abortController.signal }
  );

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

    const t = timestamp;
    const smDpi = window.devicePixelRatio;
    const mdBreakpoint = 768 * window.devicePixelRatio;
    const mdDpi =
      window.devicePixelRatio + (gl.canvas.width / mdBreakpoint - 1);
    const lgBreakpoint = 1080 * window.devicePixelRatio;
    const lgDpi =
      window.devicePixelRatio +
      (lgBreakpoint / mdBreakpoint - 1) +
      (gl.canvas.width / lgBreakpoint - 1);
    const xlBreakpoint = 2000 * window.devicePixelRatio;
    const xlDpi =
      window.devicePixelRatio +
      (lgBreakpoint / mdBreakpoint - 1) +
      (xlBreakpoint / lgBreakpoint - 1) +
      (gl.canvas.width / xlBreakpoint - 1);

    const rippleSpeed = 5; // 1 / 0.2s = 5
    rippleStrength +=
      (rippleStrengthTarget - rippleStrength) * rippleSpeed * deltaTime;
    rippleStrength = Math.floor(rippleStrength * 1000) / 1000;

    ripplePhase += rippleSpeed * deltaTime * rippleStrength * 1.5;
    ripplePhase = Math.floor(ripplePhase * 1000) / 1000;

    const uniforms = {
      u_resolution: [gl.canvas.width, gl.canvas.height],
      u_dpi:
        gl.canvas.width < mdBreakpoint
          ? smDpi
          : gl.canvas.width < lgBreakpoint
            ? mdDpi
            : gl.canvas.width < xlBreakpoint
              ? lgDpi
              : xlDpi,
      u_time: t,
      u_colorTop: colorTop,
      u_colorBottom: colorBottom,
      u_colorAltTop: colorAltTop,
      u_colorAltBottom: colorAltBottom,
      u_colorBackground: colorBackground,
      u_mouse: mousePosition,
      u_rippleStrength: rippleStrength,
      u_ripplePhase: ripplePhase,
    };
    setUniforms(programInfo, uniforms);

    drawBufferInfo(gl, bufferInfo);
  };

  const fps = 30;
  const frameDuration = 1000 / fps;
  const initialAnimationWindow = 2200;
  let animationId = null as null | number;
  let lastFrameTime = performance.now();
  let frameCounter = 0;
  let skipFpsCheck = false;

  const handleFrame: FrameRequestCallback = (timestamp) => {
    const elapsed = timestamp - lastFrameTime;

    // Throttle updates to match desired fps
    if (elapsed >= frameDuration) {
      lastFrameTime = timestamp - (elapsed % frameDuration); // Align timing
      render(timestamp - startTime);
    }

    // For the initial 3s, check the fps and decide if we need to stop animation
    if (!skipFpsCheck) {
      frameCounter++;
      const fpsElapsed = timestamp - startTime;
      if (fpsElapsed >= initialAnimationWindow) {
        const actualFps = (frameCounter * 1000) / fpsElapsed;
        skipFpsCheck = true;
        if (actualFps < 29) {
          return;
        }
      }
    }

    // Request the next frame
    animationId = requestAnimationFrame(handleFrame);
  };
  handleFrame(startTime);

  return () => {
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
    }
    observer.disconnect();
    abortController.abort();
  };
}
