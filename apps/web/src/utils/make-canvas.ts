export type Canvas2dContext =
  OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

export interface CanvasHandle {
  /** The backing canvas, usable as a `drawImage` source. */
  canvas: OffscreenCanvas | HTMLCanvasElement;
  ctx: Canvas2dContext;
  toBlob: () => Promise<Blob>;
  cleanup: () => void;
}

/**
 * A 2D canvas for offscreen rendering and PNG export. Prefers
 * `OffscreenCanvas` when available (no DOM thrash, worker-friendly) and falls
 * back to a hidden `<canvas>` appended to `document.body` when not — jsdom
 * ships `OffscreenCanvas` but its 2D context support is limited.
 */
export function makeCanvas(width: number, height: number): CanvasHandle | null {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (ctx !== null) {
      return {
        canvas,
        ctx,
        toBlob: () => canvas.convertToBlob({ type: "image/png" }),
        cleanup: () => {
          // Nothing to clean up — the canvas has no DOM presence.
        },
      };
    }
  }

  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  // Hide off-screen rather than `display: none`, which some browsers treat
  // as a hint to skip rasterisation.
  canvas.style.position = "fixed";
  canvas.style.left = "-99999px";
  canvas.style.top = "0";
  canvas.style.pointerEvents = "none";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    canvas.remove();
    return null;
  }
  return {
    canvas,
    ctx,
    toBlob: () =>
      new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob === null) {
            reject(new Error("canvas.toBlob returned null"));
            return;
          }
          resolve(blob);
        }, "image/png");
      }),
    cleanup: () => {
      canvas.remove();
    },
  };
}
