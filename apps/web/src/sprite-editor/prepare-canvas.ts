/**
 * Size a visible canvas to `cssWidth` × `cssHeight` CSS pixels with a
 * backing store at the device pixel ratio, then return a cleared 2D context
 * that draws in CSS pixels with nearest-neighbor scaling.
 */
export function prepareCanvas(
  canvas: HTMLCanvasElement,
  cssWidth: number,
  cssHeight: number,
): CanvasRenderingContext2D | null {
  const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio;
  canvas.width = Math.floor(cssWidth * dpr);
  canvas.height = Math.floor(cssHeight * dpr);
  canvas.style.width = `${String(cssWidth)}px`;
  canvas.style.height = `${String(cssHeight)}px`;
  const ctx = canvas.getContext("2d");
  if (ctx === null) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);
  ctx.imageSmoothingEnabled = false;
  return ctx;
}
