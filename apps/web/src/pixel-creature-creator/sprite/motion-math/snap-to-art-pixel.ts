// `Math.round(0.5) === 1` in V8 (half-up); `Math.round(0.49) === 0`. We
// intentionally rely on this — half-up is the natural choice for visual
// motion.
export function snapToArtPixel(value: number): number {
  return Math.round(value);
}
