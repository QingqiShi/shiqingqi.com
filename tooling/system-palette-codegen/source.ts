/**
 * Source of truth for the system palette.
 *
 * Each hue is defined by an Apple HIG-inspired sRGB color, expanded into a
 * Material 3 HCT tonal palette (CAM16 hue/chroma + CIE L* tones). A per-hue
 * Catmull-Rom spline tweaks tones to compensate for the Helmholtz-Kohlrausch
 * effect — yellows/greens read dim at high tones, indigo reads bright at low
 * tones, etc. Curve anchors are L* offsets at tone {0, 25, 50, 75, 100}.
 *
 * To regenerate src/_generated/system-palette.ts: pnpm codegen:palette
 */

export const SYSTEM_PALETTE_TONES = [
  0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
] as const;

export const ANCHOR_POSITIONS = [0, 25, 50, 75, 100] as const;

export interface SystemHueDefinition {
  name: string;
  source: string;
  curve: readonly number[];
}

export const SYSTEM_HUES: readonly SystemHueDefinition[] = [
  { name: "Red", source: "#FF3B30", curve: [0, 0, 5, 5, 0] },
  { name: "Orange", source: "#FF9500", curve: [0, 0, 12, 13, 0] },
  { name: "Yellow", source: "#FFCC00", curve: [0, 2, 15, 18, 1] },
  { name: "Green", source: "#34C759", curve: [0, 0, 13, 18, 2] },
  { name: "Mint", source: "#00C7BE", curve: [0, 0, 8, 10, 0] },
  { name: "Teal", source: "#30B0C7", curve: [0, 0, 5, 3, 0] },
  { name: "Cyan", source: "#32ADE6", curve: [0, 0, 2, 2, 0] },
  { name: "Blue", source: "#007AFF", curve: [0, -2, 3, 0, 0] },
  { name: "Indigo", source: "#5856D6", curve: [0, -7, 4, 0, 0] },
  { name: "Purple", source: "#AF52DE", curve: [0, -3, 3, 0, 0] },
  { name: "Pink", source: "#FF2D55", curve: [0, 14, 11, 2, 0] },
  { name: "Brown", source: "#A2845E", curve: [0, 11, 8, 8, 3] },
  { name: "Gray", source: "#8E8E93", curve: [0, 4, 2, 4, 0] },
];

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
