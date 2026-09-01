import { ANCHOR_POSITIONS } from "./constants.ts";

/** The Catmull-Rom L* offset a hue curve gives to tone `t`. */
export function evaluateCurve(t: number, anchors: readonly number[]): number {
  for (let i = 0; i < ANCHOR_POSITIONS.length - 1; i++) {
    const x0 = ANCHOR_POSITIONS[i];
    const x1 = ANCHOR_POSITIONS[i + 1];
    if (t >= x0 && t <= x1) {
      const u = (t - x0) / (x1 - x0);
      const y0 = anchors[i] ?? 0;
      const y1 = anchors[i + 1] ?? 0;
      const yPrev = anchors[i - 1] ?? y0;
      const yNext = anchors[i + 2] ?? y1;
      const u2 = u * u;
      const u3 = u2 * u;
      return (
        0.5 *
        (2 * y0 +
          (-yPrev + y1) * u +
          (2 * yPrev - 5 * y0 + 4 * y1 - yNext) * u2 +
          (-yPrev + 3 * y0 - 3 * y1 + yNext) * u3)
      );
    }
  }
  return 0;
}
