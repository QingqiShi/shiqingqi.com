import type { BufferInfo, ProgramInfo } from "twgl.js";
import {
  createProgramInfo,
  createBufferInfoFromArrays,
  setBuffersAndAttributes,
  resizeCanvasToDisplaySize,
  drawBufferInfo,
  setUniforms,
  createFramebufferInfo,
  bindFramebufferInfo,
  resizeFramebufferInfo,
} from "twgl.js";

interface Context {
  gl: WebGL2RenderingContext;
  pathtraceProgram: ProgramInfo;
  displayProgram: ProgramInfo;
  canvas: HTMLCanvasElement;
  bufferInfo: BufferInfo;
}

export interface FrameStats {
  fps: number;
  frameCpu: number;
  frameGpu: number | null;
  drawCalls: number;
  resolution: [number, number];
  triangles: number;
  samplesPerPixel: number;
}

export type DebugMode = "normal" | "heatmap" | "normals" | "ao";

export interface DebugOptions {
  mode: DebugMode;
  shadows: boolean;
  ao: boolean;
  fresnel: boolean;
}

const DEBUG_MODE_MAP: Record<DebugMode, number> = {
  normal: 0,
  heatmap: 1,
  normals: 2,
  ao: 3,
};

export function init(
  canvas: HTMLCanvasElement,
  vertexShaderSrc: string,
  pathtracerFragSrc: string,
  displayFragSrc: string,
): Context | undefined {
  const gl = canvas.getContext("webgl2", { premultipliedAlpha: false });
  if (!gl) return;

  // Required for rendering to float textures
  gl.getExtension("EXT_color_buffer_float");

  const pathtraceProgram = createProgramInfo(gl, [
    vertexShaderSrc,
    pathtracerFragSrc,
  ]);
  const displayProgram = createProgramInfo(gl, [
    vertexShaderSrc,
    displayFragSrc,
  ]);

  // Fullscreen quad (two triangles)
  const bufferInfo = createBufferInfoFromArrays(gl, {
    a_position: {
      numComponents: 2,
      data: [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1],
    },
  });

  return { gl, pathtraceProgram, displayProgram, canvas, bufferInfo };
}

// WebGL extension constants
const TIME_ELAPSED_EXT = 0x88bf;
const GPU_DISJOINT_EXT = 0x8fbb;

interface GpuTimer {
  begin(): void;
  endQuery(): void;
  readResult(): number | null;
}

function setupGpuTimer(gl: WebGL2RenderingContext): GpuTimer | null {
  if (!gl.getExtension("EXT_disjoint_timer_query_webgl2")) return null;

  let pendingQuery: WebGLQuery | null = null;
  let activeThisFrame = false;

  return {
    begin() {
      activeThisFrame = false;
      if (pendingQuery) return;
      const query = gl.createQuery();
      gl.beginQuery(TIME_ELAPSED_EXT, query);
      pendingQuery = query;
      activeThisFrame = true;
    },

    endQuery() {
      if (!activeThisFrame) return;
      gl.endQuery(TIME_ELAPSED_EXT);
      activeThisFrame = false;
    },

    readResult(): number | null {
      if (!pendingQuery) return null;
      const query = pendingQuery;

      if (gl.getParameter(GPU_DISJOINT_EXT)) {
        gl.deleteQuery(query);
        pendingQuery = null;
        return null;
      }

      const available = gl.getQueryParameter(
        query,
        gl.QUERY_RESULT_AVAILABLE,
      ) as boolean;
      if (!available) return null;

      const timeNs = gl.getQueryParameter(query, gl.QUERY_RESULT) as number;
      gl.deleteQuery(query);
      pendingQuery = null;
      return timeNs / 1_000_000;
    },
  };
}

function createPingPongFBOs(gl: WebGL2RenderingContext, w: number, h: number) {
  const attachments = [
    { internalFormat: gl.RGBA16F, min: gl.NEAREST, mag: gl.NEAREST },
  ];
  return {
    a: createFramebufferInfo(gl, attachments, w, h),
    b: createFramebufferInfo(gl, attachments, w, h),
    attachments,
  };
}

export interface LoopControls {
  cleanup: () => void;
  setDebug: (options: DebugOptions) => void;
  setIsDark: (next: boolean) => void;
}

type Vec3 = [number, number, number];

interface CameraBasis {
  camPos: Vec3;
  fwd: Vec3;
  right: Vec3;
  up: Vec3;
}

// Camera basis must match the ray construction in pathtracer-fs.glsl exactly —
// the shader does `rd = normalize(fwd + px*right + py*up)` using these vectors,
// and reprojection assumes the same basis for the previous frame.
// Pure top-down: fwd is straight down, so cross(fwd, worldUp) is degenerate.
// The basis is hard-coded with world +z mapped to up-on-screen so scrolling
// still pans along the z axis naturally.
function computeCameraBasis(scrollOffset: number): CameraBasis {
  return {
    camPos: [0, 7, scrollOffset],
    fwd: [0, -1, 0],
    right: [-1, 0, 0],
    up: [0, 0, 1],
  };
}

export function start(
  { gl, pathtraceProgram, displayProgram, canvas, bufferInfo }: Context,
  { isDark: initialIsDark }: { isDark: boolean },
  initialDebug: DebugOptions,
  onStats?: (stats: FrameStats) => void,
): LoopControls {
  const abortController = new AbortController();

  let debug = initialDebug;
  let prevDebugKey = JSON.stringify(debug);
  let isDark = initialIsDark;
  let prevIsDark = initialIsDark;

  const dpr = window.devicePixelRatio;

  // FBOs for accumulation ping-pong
  resizeCanvasToDisplaySize(canvas, dpr);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  const fbos = createPingPongFBOs(gl, gl.canvas.width, gl.canvas.height);
  let readFBO = fbos.a;
  let writeFBO = fbos.b;

  // RNG seed counter — monotonically increments so each frame gets a fresh
  // random sequence. Never reset; temporal stability is tracked separately.
  let frameIndex = 0;

  // Scroll offset — tied to window.scrollY so touch scroll on mobile and
  // mouse wheel on desktop both drive the camera through the browser's
  // native scroll. Scrolling down (scrollY increases) shifts the camera
  // toward -z, revealing content below the visible area on screen.
  const SCROLL_FACTOR = 0.005;
  let scrollOffset = -window.scrollY * SCROLL_FACTOR;
  let lastScrollOffset = scrollOffset;

  // Stable-frame counter: frames since the camera last moved. Drives the
  // accumulation weight so static images keep converging while scrolling
  // falls back to an EMA floor.
  let stableFrames = 0;

  // Previous camera basis used for temporal reprojection. `hasPrevFrame`
  // gates the first frame where there is nothing to reproject from.
  let prevCam: CameraBasis = computeCameraBasis(scrollOffset);
  let hasPrevFrame = false;

  // Resize handling — recreate FBOs and cold-start accumulation.
  const observer = new ResizeObserver(() => {
    resizeCanvasToDisplaySize(canvas, dpr);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    const att = fbos.attachments;
    resizeFramebufferInfo(gl, fbos.a, att, gl.canvas.width, gl.canvas.height);
    resizeFramebufferInfo(gl, fbos.b, att, gl.canvas.width, gl.canvas.height);
    hasPrevFrame = false;
    stableFrames = 0;
  });
  observer.observe(canvas);

  window.addEventListener(
    "scroll",
    () => {
      scrollOffset = -window.scrollY * SCROLL_FACTOR;
    },
    { signal: abortController.signal, passive: true },
  );

  // GPU timer
  const gpuTimer = setupGpuTimer(gl);

  // Stats tracking
  let fpsFrameCount = 0;
  let lastStatsTime = performance.now();
  let lastGpuTime: number | null = null;
  let lastCpuTime = 0;

  // Animation loop
  let animationId: number | null = null;
  const render = () => {
    if (abortController.signal.aborted) return;

    const cpuStart = performance.now();

    if (gpuTimer) {
      const gpuResult = gpuTimer.readResult();
      if (gpuResult !== null) lastGpuTime = gpuResult;
    }

    // Feature/theme changes invalidate shaded color entirely — drop history.
    // Scroll changes preserve history (reprojection handles the camera move)
    // but reset the stable-frame counter so blend weight re-floors at the
    // EMA rate.
    const debugKey = JSON.stringify(debug);
    const featuresChanged = debugKey !== prevDebugKey || isDark !== prevIsDark;
    if (featuresChanged) {
      hasPrevFrame = false;
      stableFrames = 0;
      prevDebugKey = debugKey;
      prevIsDark = isDark;
    } else if (scrollOffset !== lastScrollOffset) {
      stableFrames = 0;
      lastScrollOffset = scrollOffset;
    } else {
      stableFrames++;
    }

    const curCam = computeCameraBasis(scrollOffset);

    gpuTimer?.begin();

    // --- Pass 1: Path trace into writeFBO ---
    gl.useProgram(pathtraceProgram.program);
    setBuffersAndAttributes(gl, pathtraceProgram, bufferInfo);
    bindFramebufferInfo(gl, writeFBO);

    setUniforms(pathtraceProgram, {
      u_resolution: [gl.canvas.width, gl.canvas.height],
      u_camPos: curCam.camPos,
      u_camFwd: curCam.fwd,
      u_camRight: curCam.right,
      u_camUp: curCam.up,
      u_prevCamPos: prevCam.camPos,
      u_prevCamFwd: prevCam.fwd,
      u_prevCamRight: prevCam.right,
      u_prevCamUp: prevCam.up,
      u_hasPrevFrame: hasPrevFrame ? 1 : 0,
      u_stableFrames: stableFrames,
      u_dark: isDark ? 1.0 : 0.0,
      u_debugMode: DEBUG_MODE_MAP[debug.mode],
      u_enableShadows: debug.shadows ? 1 : 0,
      u_enableAO: debug.ao ? 1 : 0,
      u_enableFresnel: debug.fresnel ? 1 : 0,
      u_prevFrame: readFBO.attachments[0],
      u_frameIndex: frameIndex,
    });

    drawBufferInfo(gl, bufferInfo);

    // --- Pass 2: Display with tone mapping ---
    gl.useProgram(displayProgram.program);
    setBuffersAndAttributes(gl, displayProgram, bufferInfo);
    bindFramebufferInfo(gl, null);

    setUniforms(displayProgram, {
      u_texture: writeFBO.attachments[0],
      u_resolution: [gl.canvas.width, gl.canvas.height],
    });

    drawBufferInfo(gl, bufferInfo);

    gpuTimer?.endQuery();

    // Swap FBOs
    const temp = readFBO;
    readFBO = writeFBO;
    writeFBO = temp;
    frameIndex++;

    // Current camera becomes next frame's reprojection reference.
    prevCam = curCam;
    hasPrevFrame = true;

    lastCpuTime = performance.now() - cpuStart;
    fpsFrameCount++;

    // Report stats ~2x per second
    const now = performance.now();
    if (onStats && now - lastStatsTime >= 500) {
      const elapsed = now - lastStatsTime;
      onStats({
        fps: Math.round((fpsFrameCount / elapsed) * 1000),
        frameCpu: lastCpuTime,
        frameGpu: lastGpuTime,
        drawCalls: 2,
        resolution: [gl.canvas.width, gl.canvas.height],
        triangles: 2,
        samplesPerPixel: stableFrames + 1,
      });
      fpsFrameCount = 0;
      lastStatsTime = now;
    }

    animationId = requestAnimationFrame(render);
  };

  animationId = requestAnimationFrame(render);

  return {
    cleanup: () => {
      if (animationId !== null) cancelAnimationFrame(animationId);
      observer.disconnect();
      abortController.abort();
    },
    setDebug: (options: DebugOptions) => {
      debug = options;
    },
    setIsDark: (next: boolean) => {
      isDark = next;
    },
  };
}
