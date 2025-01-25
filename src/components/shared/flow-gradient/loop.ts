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
  const startTime = performance.now();

  // Resize canvas
  let resized = false;
  const observer = new ResizeObserver(() => {
    resized = resizeCanvasToDisplaySize(canvas, window.devicePixelRatio);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    render(performance.now() - startTime);
  });
  observer.observe(canvas);

  let bufferInfo: BufferInfo | undefined;
  const render = (timestamp: number) => {
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
  };
}
