/**
 * Rounds a CSS px length to whole device pixels, so text the GPU surface
 * draws lands on the same sub-pixel positions as the DOM text.
 */
export function snapToDevicePx(value: number, scale: number) {
  // At an integer scale, one CSS px is a whole number of device px.
  const step = Number.isInteger(scale) ? 1 : 1 / scale;
  return Math.round(value / step) * step;
}
