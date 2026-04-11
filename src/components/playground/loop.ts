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
      if (!query) return;
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

  const dpr = window.devicePixelRatio;

  // FBOs for accumulation ping-pong
  resizeCanvasToDisplaySize(canvas, dpr);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  const fbos = createPingPongFBOs(gl, gl.canvas.width, gl.canvas.height);
  let readFBO = fbos.a;
  let writeFBO = fbos.b;

  // Frame counter for accumulation
  let frameIndex = 0;

  // Resize handling — recreate FBOs and reset accumulation
  const observer = new ResizeObserver(() => {
    resizeCanvasToDisplaySize(canvas, dpr);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    const att = fbos.attachments;
    resizeFramebufferInfo(gl, fbos.a, att, gl.canvas.width, gl.canvas.height);
    resizeFramebufferInfo(gl, fbos.b, att, gl.canvas.width, gl.canvas.height);
    frameIndex = 0;
  });
  observer.observe(canvas);

  // Pointer tracking — drag-to-orbit camera with cumulative offset
  // cameraOffset accumulates across drag gestures (in CSS pixels)
  const cameraOffset: [number, number] = [0, 0];
  let dragStart: [number, number] | null = null;
  let dragStartOffset: [number, number] = [0, 0];

  // Virtual pointer position sent to the shader — derived from cameraOffset
  const pointerPosition: [number, number] = [0, 0];
  let lastPointerX = 0;
  let lastPointerY = 0;

  function updatePointerPosition() {
    // Shader does: mouse = u_mouse / u_resolution - 0.5
    // So canvas center → mouse = [0, 0] → default camera
    pointerPosition[0] = gl.canvas.width * 0.5 + cameraOffset[0] * dpr;
    pointerPosition[1] = gl.canvas.height * 0.5 + cameraOffset[1] * dpr;
  }

  document.addEventListener(
    "pointerdown",
    (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      dragStart = [e.clientX, e.clientY];
      dragStartOffset = [cameraOffset[0], cameraOffset[1]];
    },
    { signal: abortController.signal, passive: true },
  );

  document.addEventListener(
    "pointermove",
    (e) => {
      if (!dragStart) return;
      const dx = e.clientX - dragStart[0];
      const dy = e.clientY - dragStart[1];
      cameraOffset[0] = dragStartOffset[0] + dx;
      cameraOffset[1] = dragStartOffset[1] - dy; // flip y: drag up = camera up
      updatePointerPosition();
    },
    { signal: abortController.signal, passive: true },
  );

  document.addEventListener(
    "pointerup",
    () => {
      dragStart = null;
    },
    { signal: abortController.signal, passive: true },
  );

  document.addEventListener(
    "pointercancel",
    () => {
      dragStart = null;
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

    // Reset accumulation on mouse move or debug option change
    const curMouseX = Math.round(pointerPosition[0]);
    const curMouseY = Math.round(pointerPosition[1]);
    const debugKey = JSON.stringify(debug);
    if (
      curMouseX !== lastPointerX ||
      curMouseY !== lastPointerY ||
      debugKey !== prevDebugKey
    ) {
      frameIndex = 0;
      lastPointerX = curMouseX;
      lastPointerY = curMouseY;
      prevDebugKey = debugKey;
    }

    gpuTimer?.begin();

    // --- Pass 1: Path trace into writeFBO ---
    gl.useProgram(pathtraceProgram.program);
    setBuffersAndAttributes(gl, pathtraceProgram, bufferInfo);
    bindFramebufferInfo(gl, writeFBO);

    setUniforms(pathtraceProgram, {
      u_resolution: [gl.canvas.width, gl.canvas.height],
      u_mouse: pointerPosition,
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
        samplesPerPixel: frameIndex,
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
