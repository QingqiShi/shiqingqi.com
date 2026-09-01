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

export interface LoopControls {
  cleanup: () => void;
  setDebug: (options: DebugOptions) => void;
  setIsDark: (next: boolean) => void;
}
