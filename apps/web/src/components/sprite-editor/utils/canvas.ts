/**
 * Canvas factory shared by slicing + PNG export. Mirrors the pattern in
 * `pixel-creature-creator/review/png-export.ts`: prefer `OffscreenCanvas`
 * (no DOM thrash, worker-friendly), fall back to a hidden DOM canvas.
 */

type Ctx = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

export interface CanvasHandle {
  ctx: Ctx;
  toBlob: () => Promise<Blob>;
  cleanup: () => void;
}

export function makeCanvas(width: number, height: number): CanvasHandle | null {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (ctx !== null) {
      return {
        ctx,
        toBlob: () => canvas.convertToBlob({ type: "image/png" }),
        cleanup: () => {},
      };
    }
  }

  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
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
