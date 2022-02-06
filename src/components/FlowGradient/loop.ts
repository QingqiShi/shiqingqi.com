import {
  createProgramInfo,
  ProgramInfo,
  createBufferInfoFromArrays,
  setBuffersAndAttributes,
  Arrays,
  resizeCanvasToDisplaySize,
  drawBufferInfo,
  setUniforms,
  BufferInfo,
} from 'twgl.js';
import { createMesh } from './primitives';

interface Context {
  gl: WebGLRenderingContext;
  programInfo: ProgramInfo;
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

export function init(
  canvas: HTMLCanvasElement,
  vertexShaderSrc: string,
  fragmentShaderSrc: string
) {
  const gl = canvas.getContext('webgl2', {
    premultipliedAlpha: false,
  });
  if (!gl) return;

  const programInfo = createProgramInfo(gl, [
    vertexShaderSrc,
    fragmentShaderSrc,
  ]);

  gl.useProgram(programInfo.program);

  return { gl, programInfo };
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
  context: Context,
  {
    colorTop = [0, 0, 0.2],
    colorBottom = [0, 0, 0.8],
    colorAltTop = [1, 0, 0],
    colorAltBottom = [1, 0, 0],
    colorBackground = [0.953, 0.929, 0.929],
  }: Options
) {
  const playingRef = { current: true };
  const animationRef = { current: null as null | number };

  let bufferInfo: BufferInfo | undefined;

  const render = ({ gl, programInfo }: Context, t: number) => {
    const resized = resizeCanvasToDisplaySize(
      gl.canvas as HTMLCanvasElement,
      window.devicePixelRatio
    );
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    if (resized || !bufferInfo) {
      bufferInfo = getBufferInfo(context, gl.canvas.width, gl.canvas.height);
    }

    const uniforms = {
      u_resolution: [gl.canvas.width, gl.canvas.height],
      u_dpi: window.devicePixelRatio,
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
  const loop: FrameRequestCallback = (time) => {
    render(context, time);
    setTimeout(() => {
      if (playingRef.current) {
        animationRef.current = requestAnimationFrame(loop);
      }
    }, 1000 / fps);
  };
  loop(performance.now());

  return () => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      playingRef.current = false;
      console.log('stopped');
    }
  };
}
